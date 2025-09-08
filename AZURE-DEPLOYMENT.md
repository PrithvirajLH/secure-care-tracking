# Azure Deployment Guide for SecureCare Application

This guide will help you deploy the SecureCare Training Management System to Azure App Service.

## Prerequisites

1. **Azure CLI** installed and configured
   ```bash
   # Install Azure CLI
   az --version
   
   # Login to Azure
   az login
   ```

2. **Node.js 18+** installed locally
3. **Git** for version control
4. **Azure Subscription** with appropriate permissions

## Deployment Options

### Option 1: Automated Deployment Script (Recommended)

#### For Windows (PowerShell):
```powershell
# Make sure you're in the project root directory
.\deploy-azure.ps1 -ResourceGroupName "SecureCare-RG" -AppServiceName "securecare-app" -Location "East US"
```

#### For Linux/Mac (Bash):
```bash
# Make the script executable
chmod +x deploy-azure.sh

# Run the deployment script
./deploy-azure.sh "SecureCare-RG" "securecare-app" "East US"
```

### Option 2: Manual Deployment

#### Step 1: Create Azure Resources

```bash
# Create resource group
az group create --name "SecureCare-RG" --location "East US"

# Create App Service plan
az appservice plan create --name "securecare-plan" --resource-group "SecureCare-RG" --sku B1 --is-linux

# Create App Service
az webapp create --resource-group "SecureCare-RG" --plan "securecare-plan" --name "securecare-app" --runtime "NODE|18-lts"
```

#### Step 2: Configure App Service Settings

```bash
# Set environment variables
az webapp config appsettings set --resource-group "SecureCare-RG" --name "securecare-app" --settings \
    NODE_ENV=production \
    PORT=8080 \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
    DB_SERVER=your-azure-sql-server.database.windows.net \
    DB_DATABASE=SecureCare \
    DB_USER=your-db-username \
    DB_PASSWORD=your-secure-password \
    DB_ENCRYPT=true \
    DB_TRUST_SERVER_CERTIFICATE=false
```

#### Step 3: Build and Deploy

```bash
# Build the application
npm run build:prod

# Create deployment package
cd backend
zip -r ../backend.zip . -x "node_modules/*" ".env*"
cd ..

# Deploy to Azure
az webapp deployment source config-zip --resource-group "SecureCare-RG" --name "securecare-app" --src "backend.zip"
```

### Option 3: Azure DevOps Pipeline

1. **Create Azure DevOps Project**
2. **Import the repository** containing the `azure-pipelines.yml` file
3. **Configure Service Connection** to your Azure subscription
4. **Update pipeline variables** in the YAML file:
   - `azureServiceConnection`: Your Azure service connection name
   - `azureWebAppName`: Your App Service name
   - `azureResourceGroup`: Your resource group name
5. **Run the pipeline** - it will automatically build and deploy on push to main branch

## Database Setup

### Azure SQL Database

1. **Create Azure SQL Server**:
   ```bash
   az sql server create --name "securecare-sql-server" --resource-group "SecureCare-RG" --location "East US" --admin-user "securecareadmin" --admin-password "YourSecurePassword123!"
   ```

2. **Create Database**:
   ```bash
   az sql db create --resource-group "SecureCare-RG" --server "securecare-sql-server" --name "SecureCare" --service-objective "S0"
   ```

3. **Configure Firewall**:
   ```bash
   # Allow Azure services
   az sql server firewall-rule create --resource-group "SecureCare-RG" --server "securecare-sql-server" --name "AllowAzureServices" --start-ip-address 0.0.0.0 --end-ip-address 0.0.0.0
   
   # Allow your IP (replace with your actual IP)
   az sql server firewall-rule create --resource-group "SecureCare-RG" --server "securecare-sql-server" --name "AllowMyIP" --start-ip-address YOUR_IP --end-ip-address YOUR_IP
   ```

4. **Run Database Scripts**:
   - Connect to your Azure SQL Database
   - Run the scripts from `backend/scripts/` directory
   - Start with `securecare_seed.sql` for basic setup

## Environment Configuration

### Required Environment Variables

Set these in your Azure App Service Configuration:

```bash
# Database Configuration
DB_SERVER=your-azure-sql-server.database.windows.net
DB_DATABASE=SecureCare
DB_USER=your-db-username
DB_PASSWORD=your-secure-password
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false

# Server Configuration
NODE_ENV=production
PORT=8080

# CORS Configuration
CORS_ORIGINS=https://your-app-name.azurewebsites.net

# Azure App Service
WEBSITES_ENABLE_APP_SERVICE_STORAGE=false
WEBSITES_NODE_DEFAULT_VERSION=18.17.0
```

## Post-Deployment

### 1. Verify Deployment

```bash
# Get your app URL
az webapp show --resource-group "SecureCare-RG" --name "securecare-app" --query "defaultHostName" -o tsv
```

### 2. Test the Application

- **Frontend**: `https://your-app-name.azurewebsites.net`
- **API Health**: `https://your-app-name.azurewebsites.net/api/health`
- **API Endpoints**: `https://your-app-name.azurewebsites.net/api/securecare`

### 3. Monitor and Troubleshoot

```bash
# View logs
az webapp log tail --resource-group "SecureCare-RG" --name "securecare-app"

# Check app settings
az webapp config appsettings list --resource-group "SecureCare-RG" --name "securecare-app"
```

## Security Considerations

1. **Database Security**:
   - Use strong passwords
   - Enable Azure SQL Database firewall rules
   - Consider using Azure Key Vault for secrets

2. **App Service Security**:
   - Enable HTTPS only
   - Configure custom domain with SSL
   - Set up authentication if needed

3. **Environment Variables**:
   - Never commit `.env` files to version control
   - Use Azure App Service Configuration for production secrets

## Scaling and Performance

1. **App Service Plan**:
   - Start with B1 (Basic) for development
   - Scale to S1 (Standard) for production
   - Consider Premium plans for high traffic

2. **Database**:
   - Start with S0 (Basic)
   - Scale up based on usage
   - Consider read replicas for high read workloads

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Check build logs in Azure DevOps

2. **Database Connection Issues**:
   - Verify firewall rules
   - Check connection string format
   - Ensure database exists and is accessible

3. **Static File Issues**:
   - Verify web.config is present
   - Check MIME type configurations
   - Ensure dist folder is properly deployed

### Getting Help

- Check Azure App Service logs
- Review Azure SQL Database metrics
- Use Azure Application Insights for monitoring
- Contact Azure support for infrastructure issues

## Cost Optimization

1. **Use appropriate SKUs** for your workload
2. **Enable auto-scaling** for variable traffic
3. **Monitor usage** with Azure Cost Management
4. **Consider reserved instances** for predictable workloads

---

## Quick Start Commands

```bash
# Complete deployment in one go
npm run build:prod
./deploy-azure.sh "SecureCare-RG" "securecare-app" "East US"

# Check deployment status
az webapp show --resource-group "SecureCare-RG" --name "securecare-app" --query "state"
```
