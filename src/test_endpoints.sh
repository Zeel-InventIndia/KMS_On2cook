#!/bin/bash

# On2Cook Endpoint Testing Script
# This script tests the deployed server endpoints

echo "🧪 On2Cook Endpoint Testing Script"
echo "==================================="

# Get project reference and API key
if [ -z "$SUPABASE_PROJECT_REF" ]; then
    echo "Please enter your Supabase project reference:"
    read -p "Project Reference: " PROJECT_REF
else
    PROJECT_REF="$SUPABASE_PROJECT_REF"
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "Please enter your Supabase anon key:"
    read -p "Anon Key: " ANON_KEY
else
    ANON_KEY="$SUPABASE_ANON_KEY"
fi

BASE_URL="https://$PROJECT_REF.supabase.co/functions/v1/make-server-3005c377"

echo ""
echo "Testing endpoints at: $BASE_URL"
echo ""

# Test 1: Health Check
echo "🏥 Testing Health Check..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" \
    -H "Authorization: Bearer $ANON_KEY" \
    "$BASE_URL/health")

HTTP_CODE="${HEALTH_RESPONSE: -3}"
RESPONSE_BODY="${HEALTH_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Health check passed (HTTP 200)"
    echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "Response: $RESPONSE_BODY"
else
    echo "❌ Health check failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""

# Test 2: CSV Data Endpoint
echo "📊 Testing CSV Data Endpoint..."
CSV_URL="https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455"
CSV_RESPONSE=$(curl -s -w "%{http_code}" \
    -H "Authorization: Bearer $ANON_KEY" \
    "$BASE_URL/csv/data?demoRequestsCsvUrl=$(echo $CSV_URL | sed 's/&/%26/g')")

HTTP_CODE="${CSV_RESPONSE: -3}"
RESPONSE_BODY="${CSV_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ CSV data endpoint passed (HTTP 200)"
    echo "Response contains demo requests data"
else
    echo "❌ CSV data endpoint failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""

# Test 3: Dropbox Token Test (if token provided)
if [ -n "$DROPBOX_TOKEN" ]; then
    echo "🔑 Testing Dropbox Token..."
    DROPBOX_RESPONSE=$(curl -s -w "%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $ANON_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"token\":\"$DROPBOX_TOKEN\"}" \
        "$BASE_URL/dropbox/test-token")
    
    HTTP_CODE="${DROPBOX_RESPONSE: -3}"
    RESPONSE_BODY="${DROPBOX_RESPONSE%???}"
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Dropbox token test passed (HTTP 200)"
        echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "Response: $RESPONSE_BODY"
    else
        echo "❌ Dropbox token test failed (HTTP $HTTP_CODE)"
        echo "Response: $RESPONSE_BODY"
    fi
else
    echo "⏭️  Skipping Dropbox token test (no DROPBOX_TOKEN provided)"
fi

echo ""

# Test 4: Google Sheets Debug
echo "📋 Testing Google Sheets Debug..."
SHEETS_DEBUG_RESPONSE=$(curl -s -w "%{http_code}" \
    -H "Authorization: Bearer $ANON_KEY" \
    "$BASE_URL/debug-service-account")

HTTP_CODE="${SHEETS_DEBUG_RESPONSE: -3}"
RESPONSE_BODY="${SHEETS_DEBUG_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Google Sheets debug passed (HTTP 200)"
    echo "Response: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "Response: $RESPONSE_BODY"
else
    echo "❌ Google Sheets debug failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""

# Test 5: Recipes Endpoint
echo "🍳 Testing Recipes Endpoint..."
RECIPES_RESPONSE=$(curl -s -w "%{http_code}" \
    -H "Authorization: Bearer $ANON_KEY" \
    "$BASE_URL/recipes")

HTTP_CODE="${RECIPES_RESPONSE: -3}"
RESPONSE_BODY="${RECIPES_RESPONSE%???}"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Recipes endpoint passed (HTTP 200)"
    echo "Retrieved recipes data"
else
    echo "❌ Recipes endpoint failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

echo ""

# Summary
echo "🎯 Test Summary"
echo "==============="
echo ""
echo "All endpoints have been tested. If any tests failed:"
echo ""
echo "1. Check environment variables in Supabase Dashboard"
echo "2. Verify the function logs in Supabase Dashboard"
echo "3. Ensure all required secrets are properly configured"
echo ""
echo "Common fixes:"
echo "- Set DROPBOX_ACCESS_TOKEN in environment variables"
echo "- Set GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON properly formatted"
echo "- Verify ON2COOK_SPREADSHEET_ID is correct"
echo ""
echo "To set environment variables for testing:"
echo "export SUPABASE_PROJECT_REF='your-project-ref'"
echo "export SUPABASE_ANON_KEY='your-anon-key'"
echo "export DROPBOX_TOKEN='your-dropbox-token'  # optional"