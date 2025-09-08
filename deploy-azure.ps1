# Azure Deployment Script for SecureCare Application
param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$true)]
    [string]$AppServiceName,
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "East US",
    
    [Parameter(Mandatory=$false)]
    [string]$SubscriptionId
)

Write-Host "🚀 Starting Azure deployment for SecureCare Application..." -ForegroundColor Green

# Set subscription if provided
if ($SubscriptionId) {
    Write-Host "Setting Azure subscription to: $SubscriptionId" -ForegroundColor Yellow
    az account set --subscription $SubscriptionId
}

# Check if logged in to Azure
$account = az account show --query "user.name" -o tsv 2>$null
if (-not $account) {
    Write-Host "❌ Not logged in to Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Logged in as: $account" -ForegroundColor Green

# Create resource group if it doesn't exist
Write-Host "📁 Creating resource group: $ResourceGroupName" -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location

# Create App Service plan
$appServicePlanName = "$AppServiceName-plan"
Write-Host "📋 Creating App Service plan: $appServicePlanName" -ForegroundColor Yellow
az appservice plan create --name $appServicePlanName --resource-group $ResourceGroupName --sku B1 --is-linux

# Create App Service
Write-Host "🌐 Creating App Service: $AppServiceName" -ForegroundColor Yellow
az webapp create --resource-group $ResourceGroupName --plan $appServicePlanName --name $AppServiceName --runtime "NODE|18-lts"

# Configure App Service settings
Write-Host "⚙️ Configuring App Service settings..." -ForegroundColor Yellow
az webapp config appsettings set --resource-group $ResourceGroupName --name $AppServiceName --settings @(
    "NODE_ENV=production",
    "PORT=8080",
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE=false"
)

# Build the application
Write-Host "🔨 Building application..." -ForegroundColor Yellow
npm run build:prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Deploy to Azure
Write-Host "🚀 Deploying to Azure..." -ForegroundColor Yellow
az webapp deployment source config-zip --resource-group $ResourceGroupName --name $AppServiceName --src "backend.zip"

# Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow
Compress-Archive -Path "backend\*" -DestinationPath "backend.zip" -Force

# Deploy the package
Write-Host "🚀 Deploying package to Azure..." -ForegroundColor Yellow
az webapp deployment source config-zip --resource-group $ResourceGroupName --name $AppServiceName --src "backend.zip"

# Get the app URL
$appUrl = az webapp show --resource-group $ResourceGroupName --name $AppServiceName --query "defaultHostName" -o tsv
$fullUrl = "https://$appUrl"

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host "🌐 Application URL: $fullUrl" -ForegroundColor Cyan
Write-Host "🔧 API URL: $fullUrl/api" -ForegroundColor Cyan

# Clean up
Remove-Item "backend.zip" -Force -ErrorAction SilentlyContinue

Write-Host "🎉 SecureCare Application is now live on Azure!" -ForegroundColor Green
