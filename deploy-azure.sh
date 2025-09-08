#!/bin/bash

# Azure Deployment Script for SecureCare Application
# Usage: ./deploy-azure.sh <ResourceGroupName> <AppServiceName> [Location] [SubscriptionId]

set -e

# Check if required parameters are provided
if [ $# -lt 2 ]; then
    echo "❌ Usage: $0 <ResourceGroupName> <AppServiceName> [Location] [SubscriptionId]"
    echo "   Example: $0 SecureCare-RG securecare-app \"East US\""
    exit 1
fi

RESOURCE_GROUP_NAME=$1
APP_SERVICE_NAME=$2
LOCATION=${3:-"East US"}
SUBSCRIPTION_ID=$4

echo "🚀 Starting Azure deployment for SecureCare Application..."

# Set subscription if provided
if [ ! -z "$SUBSCRIPTION_ID" ]; then
    echo "Setting Azure subscription to: $SUBSCRIPTION_ID"
    az account set --subscription "$SUBSCRIPTION_ID"
fi

# Check if logged in to Azure
ACCOUNT=$(az account show --query "user.name" -o tsv 2>/dev/null)
if [ -z "$ACCOUNT" ]; then
    echo "❌ Not logged in to Azure. Please run 'az login' first."
    exit 1
fi

echo "✅ Logged in as: $ACCOUNT"

# Create resource group if it doesn't exist
echo "📁 Creating resource group: $RESOURCE_GROUP_NAME"
az group create --name "$RESOURCE_GROUP_NAME" --location "$LOCATION"

# Create App Service plan
APP_SERVICE_PLAN_NAME="$APP_SERVICE_NAME-plan"
echo "📋 Creating App Service plan: $APP_SERVICE_PLAN_NAME"
az appservice plan create --name "$APP_SERVICE_PLAN_NAME" --resource-group "$RESOURCE_GROUP_NAME" --sku B1 --is-linux

# Create App Service
echo "🌐 Creating App Service: $APP_SERVICE_NAME"
az webapp create --resource-group "$RESOURCE_GROUP_NAME" --plan "$APP_SERVICE_PLAN_NAME" --name "$APP_SERVICE_NAME" --runtime "NODE|18-lts"

# Configure App Service settings
echo "⚙️ Configuring App Service settings..."
az webapp config appsettings set --resource-group "$RESOURCE_GROUP_NAME" --name "$APP_SERVICE_NAME" --settings \
    NODE_ENV=production \
    PORT=8080 \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE=false

# Build the application
echo "🔨 Building application..."
npm run build:prod

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Create deployment package
echo "📦 Creating deployment package..."
cd backend
zip -r ../backend.zip . -x "node_modules/*" ".env*"
cd ..

# Deploy to Azure
echo "🚀 Deploying to Azure..."
az webapp deployment source config-zip --resource-group "$RESOURCE_GROUP_NAME" --name "$APP_SERVICE_NAME" --src "backend.zip"

# Get the app URL
APP_URL=$(az webapp show --resource-group "$RESOURCE_GROUP_NAME" --name "$APP_SERVICE_NAME" --query "defaultHostName" -o tsv)
FULL_URL="https://$APP_URL"

echo "✅ Deployment completed successfully!"
echo "🌐 Application URL: $FULL_URL"
echo "🔧 API URL: $FULL_URL/api"

# Clean up
rm -f backend.zip

echo "🎉 SecureCare Application is now live on Azure!"
