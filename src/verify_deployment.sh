#!/bin/bash

# On2Cook Server Deployment Verification Script
# This script tests all endpoints and service account functionality

set -e

PROJECT_REF="wpnshiyspzpnnfmomegm"
FUNCTION_NAME="make-server-3005c377"
BASE_URL="https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME"

echo "🔍 Verifying On2Cook server deployment..."
echo "🔗 Base URL: $BASE_URL"
echo ""

# Test 1: Health Check
echo "1️⃣ Testing health endpoint..."
HEALTH_URL="$BASE_URL/health"
HEALTH_RESPONSE=$(curl -s "$HEALTH_URL")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status // "unknown"')

if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo "✅ Health check passed"
    echo "   Environment variables detected:"
    echo "$HEALTH_RESPONSE" | jq '.environment' || echo "   Unable to parse environment info"
else
    echo "❌ Health check failed"
    echo "   Response: $HEALTH_RESPONSE"
fi
echo ""

# Test 2: Debug Service Account
echo "2️⃣ Testing service account debug..."
DEBUG_URL="$BASE_URL/debug-service-account"
DEBUG_RESPONSE=$(curl -s "$DEBUG_URL")
DEBUG_SUCCESS=$(echo "$DEBUG_RESPONSE" | jq -r '.success // false')

if [ "$DEBUG_SUCCESS" = "true" ]; then
    echo "✅ Debug endpoint accessible"
    
    # Check service account configuration
    SA_CONFIGURED=$(echo "$DEBUG_RESPONSE" | jq -r '.debug.serviceAccount.isConfigured // false')
    SA_EMAIL=$(echo "$DEBUG_RESPONSE" | jq -r '.debug.serviceAccount.email // "not found"')
    
    if [ "$SA_CONFIGURED" = "true" ]; then
        echo "✅ Service account configured: $SA_EMAIL"
        
        # Check sheet test
        SHEET_SUCCESS=$(echo "$DEBUG_RESPONSE" | jq -r '.debug.sheetTest.result.success // false')
        if [ "$SHEET_SUCCESS" = "true" ]; then
            ROW_COUNT=$(echo "$DEBUG_RESPONSE" | jq -r '.debug.sheetTest.result.rowCount // 0')
            echo "✅ Google Sheets access working ($ROW_COUNT rows found)"
        else
            SHEET_ERROR=$(echo "$DEBUG_RESPONSE" | jq -r '.debug.sheetTest.error // "unknown error"')
            echo "❌ Google Sheets access failed: $SHEET_ERROR"
        fi
    else
        SA_ERROR=$(echo "$DEBUG_RESPONSE" | jq -r '.debug.serviceAccount.parseError // "configuration missing"')
        echo "❌ Service account not configured: $SA_ERROR"
    fi
else
    echo "❌ Debug endpoint failed"
    echo "   Response: $DEBUG_RESPONSE"
fi
echo ""

# Test 3: CSV Data Endpoint
echo "3️⃣ Testing CSV data endpoint..."
CSV_URL="$BASE_URL/csv/data?demoRequestsCsvUrl=https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455"
CSV_RESPONSE=$(curl -s "$CSV_URL")
CSV_SUCCESS=$(echo "$CSV_RESPONSE" | jq -r '.success // false')

if [ "$CSV_SUCCESS" = "true" ]; then
    DEMO_COUNT=$(echo "$CSV_RESPONSE" | jq -r '.data.demoRequests | length // 0')
    TASK_COUNT=$(echo "$CSV_RESPONSE" | jq -r '.data.tasks | length // 0')
    echo "✅ CSV data endpoint working ($DEMO_COUNT demos, $TASK_COUNT tasks)"
else
    CSV_ERROR=$(echo "$CSV_RESPONSE" | jq -r '.error // "unknown error"')
    echo "❌ CSV data endpoint failed: $CSV_ERROR"
fi
echo ""

# Test 4: Spreadsheet Validation
echo "4️⃣ Testing spreadsheet validation..."
VALIDATE_URL="$BASE_URL/validate-spreadsheet?spreadsheetId=1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM"
VALIDATE_RESPONSE=$(curl -s "$VALIDATE_URL")
VALIDATE_SUCCESS=$(echo "$VALIDATE_RESPONSE" | jq -r '.success // false')

if [ "$VALIDATE_SUCCESS" = "true" ]; then
    ACCESSIBLE=$(echo "$VALIDATE_RESPONSE" | jq -r '.accessible // false')
    ACCESSIBLE_FORMATS=$(echo "$VALIDATE_RESPONSE" | jq -r '.accessibleFormats // 0')
    
    if [ "$ACCESSIBLE" = "true" ]; then
        echo "✅ Spreadsheet validation passed ($ACCESSIBLE_FORMATS accessible formats)"
    else
        echo "❌ Spreadsheet not accessible"
        echo "   Recommendation: $(echo "$VALIDATE_RESPONSE" | jq -r '.recommendation // "Check sharing permissions"')"
    fi
else
    echo "❌ Spreadsheet validation failed"
fi
echo ""

# Summary
echo "📋 Deployment Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create summary based on tests
if [ "$HEALTH_STATUS" = "healthy" ] && [ "$DEBUG_SUCCESS" = "true" ] && [ "$SA_CONFIGURED" = "true" ]; then
    echo "🎉 All core systems operational!"
    echo ""
    echo "✅ Server health: OK"
    echo "✅ Service account: Configured"
    echo "✅ Google Sheets: $([ "$SHEET_SUCCESS" = "true" ] && echo "Accessible" || echo "Needs attention")"
    echo "✅ CSV endpoint: $([ "$CSV_SUCCESS" = "true" ] && echo "Working" || echo "Needs attention")"
    echo ""
    echo "🚀 System ready for production use!"
else
    echo "⚠️  Some issues detected:"
    echo ""
    [ "$HEALTH_STATUS" != "healthy" ] && echo "❌ Server health check failed"
    [ "$DEBUG_SUCCESS" != "true" ] && echo "❌ Debug endpoint not accessible"
    [ "$SA_CONFIGURED" != "true" ] && echo "❌ Service account not configured"
    echo ""
    echo "🔧 Please review the issues above and:"
    echo "   1. Check environment variables in Supabase dashboard"
    echo "   2. Verify service account JSON is valid"
    echo "   3. Ensure Google Sheets sharing permissions"
fi

echo ""
echo "🔗 Useful links:"
echo "   Supabase Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF"
echo "   Debug Endpoint: $DEBUG_URL"
echo "   Health Endpoint: $BASE_URL/health"