# Hockey Pong Infrastructure

Azure infrastructure and deployment configuration for Hockey Pong, using Azure Container Instances (ACI).

## Files

- **`main.bicep`** — Azure infrastructure definition (ACR + ACI)
- **`main.bicepparam`** — Default parameter values
- **`../Dockerfile`** — Multi-stage container image build
- **`../.dockerignore`** — Files excluded from Docker build context
- **`../.github/workflows/deploy.yml`** — CI/CD pipeline

## Architecture

- **Azure Container Registry (ACR):** Basic SKU, admin enabled for ACI image pull
- **Azure Container Instance (ACI):** 1 vCPU, 1 GB RAM, Linux, public IP with DNS label
- **Container Image:** Node.js 20 Alpine, multi-stage build
- **Port:** 8080 (TCP)
- **Region:** East US 2 (configurable)
- **WebSockets:** Native support on ACI (no special config needed)
- **Restart Policy:** Always

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
git commit -m "Deploy Hockey Pong to ACI"
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

### Build and Push Container Image

```bash
# Login to ACR
az acr login --name hockeypongacr

# Build and push
docker build -t hockeypongacr.azurecr.io/hockeypong:latest .
docker push hockeypongacr.azurecr.io/hockeypong:latest
```

### Deploy / Update Container

```bash
# Get ACR credentials
ACR_USER=$(az acr credential show --name hockeypongacr --query username -o tsv)
ACR_PASS=$(az acr credential show --name hockeypongacr --query 'passwords[0].value' -o tsv)

# Create or update the container instance
az container create \
  --resource-group hockeypong-rg \
  --name hockeypong-ci \
  --image hockeypongacr.azurecr.io/hockeypong:latest \
  --registry-login-server hockeypongacr.azurecr.io \
  --registry-username $ACR_USER \
  --registry-password $ACR_PASS \
  --dns-name-label hockeypong \
  --ports 8080 \
  --os-type Linux \
  --cpu 1 --memory 1 \
  --environment-variables PORT=8080 \
  --restart-policy Always
```

## Configuration

Edit `main.bicepparam` to change defaults:

```bicep
using './main.bicep'

param appName = 'my-custom-name'  // Change app & DNS label name
```

## Monitoring

- **Azure Portal:** Container Instances → hockeypong-ci → Logs / Events
- **Container Logs:** `az container logs --name hockeypong-ci --resource-group hockeypong-rg`
- **Attach to stdout:** `az container attach --name hockeypong-ci --resource-group hockeypong-rg`
- **Container status:** `az container show --name hockeypong-ci --resource-group hockeypong-rg --query instanceView.state`

## Troubleshooting

### WebSocket connections failing
- ACI natively supports WebSockets — no special config required
- Ensure the client connects to `ws://{fqdn}:8080` (not HTTPS — ACI doesn't terminate TLS)

### Container not starting
- Check logs: `az container logs --name hockeypong-ci --resource-group hockeypong-rg`
- Check events: `az container show --name hockeypong-ci --resource-group hockeypong-rg --query 'instanceView.events'`
- Verify the image exists in ACR: `az acr repository show-tags --name hockeypongacr --repository hockeypong`

### Deployment fails
- Check GitHub Actions logs for error messages
- Verify all three GitHub secrets are configured correctly
- Ensure service principal has Contributor role on resource group
- Ensure ACR admin is enabled: `az acr update --name hockeypongacr --admin-enabled true`

## Cost

- **ACR Basic:** ~$5/month
- **ACI (1 vCPU, 1 GB):** ~$35/month (running 24/7)
- **Bandwidth:** First 100 GB free, then $0.087/GB

To reduce costs:
- Stop the container when not in use: `az container stop --name hockeypong-ci --resource-group hockeypong-rg`
- Restart when needed: `az container start --name hockeypong-ci --resource-group hockeypong-rg`
