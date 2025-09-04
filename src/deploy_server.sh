#!/bin/bash

# On2Cook Server Deployment Script
# This script deploys the updated server code to Supabase

echo "🚀 On2Cook Server Deployment Script"
echo "====================================="

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/functions/server/index.tsx" ]; then
    echo "❌ Cannot find server/index.tsx. Please run this script from the project root."
    exit 1
fi

echo "✅ Found server code at supabase/functions/server/index.tsx"

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ You are not logged in to Supabase. Please run:"
    echo "supabase login"
    exit 1
fi

echo "✅ Supabase CLI is authenticated"

# Get project reference
echo ""
echo "🔍 Detecting Supabase project..."
PROJECT_REF=""

# Try to get project ref from .env or supabase config
if [ -f ".env" ]; then
    PROJECT_REF=$(grep -o 'https://[^.]*\.supabase\.co' .env | head -1 | cut -d'/' -f3 | cut -d'.' -f1)
fi

if [ -f "supabase/config.toml" ]; then
    CONFIG_PROJECT_REF=$(grep 'project_id' supabase/config.toml | cut -d'"' -f2)
    if [ -n "$CONFIG_PROJECT_REF" ]; then
        PROJECT_REF="$CONFIG_PROJECT_REF"
    fi
fi

if [ -z "$PROJECT_REF" ]; then
    echo "⚠️  Could not auto-detect project reference."
    echo "Please enter your Supabase project reference:"
    read -p "Project Reference: " PROJECT_REF
    
    if [ -z "$PROJECT_REF" ]; then
        echo "❌ Project reference is required"
        exit 1
    fi
fi

echo "✅ Using project reference: $PROJECT_REF"

# Backup existing function (if it exists)
echo ""
echo "💾 Creating backup of existing function..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Try to download existing function for backup
supabase functions download server --project-ref "$PROJECT_REF" --output "$BACKUP_DIR/server_backup.tsx" 2>/dev/null || echo "ℹ️  No existing function to backup"

# Deploy the updated server function
echo ""
echo "🚀 Deploying updated server function..."
if supabase functions deploy server --project-ref "$PROJECT_REF"; then
    echo "✅ Server function deployed successfully!"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi

# Test the deployment
echo ""
echo "🧪 Testing deployment..."
SUPABASE_URL="https://$PROJECT_REF.supabase.co"

# Test health endpoint
echo "Testing health endpoint..."
if curl -s -f "$SUPABASE_URL/functions/v1/make-server-3005c377/health" > /dev/null; then
    echo "✅ Health endpoint is responding"
else
    echo "⚠️  Health endpoint test failed - this might be normal if environment variables aren't set"
fi

# Display next steps
echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "Next steps:"
echo "1. Verify environment variables are set in Supabase Dashboard:"
echo "   - DROPBOX_ACCESS_TOKEN"
echo "   - GOOGLE_SHEETS_API_KEY"
echo "   - GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON"
echo "   - ON2COOK_SPREADSHEET_ID"
echo ""
echo "2. Test the Dropbox endpoints:"
echo "   - Health check: $SUPABASE_URL/functions/v1/make-server-3005c377/health"
echo "   - Test token: $SUPABASE_URL/functions/v1/make-server-3005c377/dropbox/test-token"
echo ""
echo "3. Check the function logs in Supabase Dashboard for any errors"
echo ""
echo "Your server is now deployed with the latest Dropbox fixes! 🎉"