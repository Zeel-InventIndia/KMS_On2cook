#!/bin/bash

# On2Cook Server Deployment Script
# This script deploys the make-server-3005c377 function to Supabase

set -e  # Exit on any error

PROJECT_REF="wpnshiyspzpnnfmomegm"
FUNCTION_NAME="make-server-3005c377"

echo "🚀 Starting On2Cook server deployment..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if user is logged in
if ! supabase status &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "supabase login"
    exit 1
fi

echo "✅ Supabase CLI found and authenticated"

# Deploy the function
echo "📦 Deploying function: $FUNCTION_NAME..."
supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
else
    echo "❌ Function deployment failed!"
    exit 1
fi

# Test the deployment
echo "🧪 Testing deployment..."

HEALTH_URL="https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME/health"
DEBUG_URL="https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME/debug-service-account"

echo "📊 Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$HEALTH_RESPONSE" -eq 200 ]; then
    echo "✅ Health check passed (200 OK)"
else
    echo "❌ Health check failed (HTTP $HEALTH_RESPONSE)"
    echo "🔗 Health URL: $HEALTH_URL"
    exit 1
fi

echo "🔍 Testing debug endpoint..."
DEBUG_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DEBUG_URL")

if [ "$DEBUG_RESPONSE" -eq 200 ]; then
    echo "✅ Debug endpoint accessible (200 OK)"
    echo "🔗 Debug URL: $DEBUG_URL"
    
    # Get debug info
    echo "📋 Service account status:"
    curl -s "$DEBUG_URL" | jq '.debug.serviceAccount // "No service account info"' || echo "Unable to parse debug response"
else
    echo "❌ Debug endpoint failed (HTTP $DEBUG_RESPONSE)"
    echo "🔗 Debug URL: $DEBUG_URL"
fi

# Check environment variables
echo "🔧 Checking required environment variables..."
echo "📝 Please ensure these are set in your Supabase dashboard:"
echo "   - GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON"
echo "   - ON2COOK_SPREADSHEET_ID"

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📍 Available endpoints:"
echo "   Health: $HEALTH_URL"
echo "   Debug:  $DEBUG_URL"
echo "   CSV:    https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME/csv/data"
echo ""
echo "📖 Next steps:"
echo "   1. Set environment variables in Supabase dashboard"
echo "   2. Test debug endpoint to verify service account"
echo "   3. Test CSV endpoint with your Google Sheets URL"
echo ""
echo "🔗 Supabase dashboard: https://supabase.com/dashboard/project/$PROJECT_REF"