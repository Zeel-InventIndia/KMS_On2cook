#!/bin/bash

# Create Local On2Cook Project Script
# This script creates the directory structure and placeholder files for local deployment

echo "🏗️ Creating On2Cook local project structure..."

# Create directory structure
mkdir -p supabase/functions/server
echo "📁 Created directory: supabase/functions/server"

# Create placeholder files with instructions
cat > supabase/functions/server/index.tsx << 'EOF'
// COPY THE COMPLETE CONTENT FROM:
// Figma Make Environment: /supabase/functions/server/index.tsx
//
// This file contains:
// - All API routes (/health, /debug-service-account, /csv/data, etc.)
// - Recipe repository endpoints
// - Demo request management
// - Google Sheets integration routes
//
// Make sure to copy the ENTIRE file content (it's quite large)
EOF

cat > supabase/functions/server/googleSheetsServiceAccount.tsx << 'EOF'
// COPY THE COMPLETE CONTENT FROM:
// Figma Make Environment: /supabase/functions/server/googleSheetsServiceAccount.tsx
//
// This file contains:
// - Service account authentication
// - JWT token generation  
// - Google Sheets API integration
// - Secure credential management
EOF

cat > supabase/functions/server/googleSheetsUpdater.tsx << 'EOF'  
// COPY THE COMPLETE CONTENT FROM:
// Figma Make Environment: /supabase/functions/server/googleSheetsUpdater.tsx
//
// This file contains:
// - Google Sheets update operations
// - Row finding and updating logic
// - Batch update capabilities
// - Service account enforcement
EOF

cat > supabase/functions/server/csvDataService.tsx << 'EOF'
// COPY THE COMPLETE CONTENT FROM:
// Your existing csvDataService.tsx file
//
// This file should already exist in your project and contains:
// - CSV parsing logic
// - Data transformation functions
// - Error handling for CSV operations
EOF

cat > supabase/functions/server/kv_store.tsx << 'EOF'
// COPY THE COMPLETE CONTENT FROM:
// Your existing kv_store.tsx file (PROTECTED FILE)
//
// This file should already exist and contains:
// - Key-value store operations
// - Database interaction functions
// - Should NOT be modified manually
EOF

# Create deployment script
cat > deploy_on2cook.sh << 'EOF'
#!/bin/bash

PROJECT_REF="wpnshiyspzpnnfmomegm"
FUNCTION_NAME="make-server-3005c377"

echo "🚀 Deploying On2Cook server to Supabase..."

# Check if files have been populated
echo "🔍 Checking if files are ready for deployment..."

# Check index.tsx
if grep -q "COPY THE COMPLETE CONTENT" supabase/functions/server/index.tsx; then
    echo "❌ index.tsx still contains placeholder content"
    echo "   Please copy the real content from Figma Make environment"
    exit 1
fi

# Check googleSheetsServiceAccount.tsx
if grep -q "COPY THE COMPLETE CONTENT" supabase/functions/server/googleSheetsServiceAccount.tsx; then
    echo "❌ googleSheetsServiceAccount.tsx still contains placeholder content"  
    echo "   Please copy the real content from Figma Make environment"
    exit 1
fi

# Check googleSheetsUpdater.tsx
if grep -q "COPY THE COMPLETE CONTENT" supabase/functions/server/googleSheetsUpdater.tsx; then
    echo "❌ googleSheetsUpdater.tsx still contains placeholder content"
    echo "   Please copy the real content from Figma Make environment" 
    exit 1
fi

echo "✅ All files appear to be ready"

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not installed. Run: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"

# Deploy function
echo "📦 Deploying function: $FUNCTION_NAME..."
supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
else
    echo "❌ Function deployment failed!"
    exit 1
fi

# Test deployment
echo "🧪 Testing deployment..."

HEALTH_URL="https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME/health"
DEBUG_URL="https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME/debug-service-account"

echo "📊 Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$HEALTH_RESPONSE" -eq 200 ]; then
    echo "✅ Health check passed (200 OK)"
    echo "🔗 Health URL: $HEALTH_URL"
else
    echo "❌ Health check failed (HTTP $HEALTH_RESPONSE)"
fi

echo "🔍 Testing debug endpoint..."  
DEBUG_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$DEBUG_URL")

if [ "$DEBUG_RESPONSE" -eq 200 ]; then
    echo "✅ Debug endpoint accessible (200 OK)"
    echo "🔗 Debug URL: $DEBUG_URL"
    
    echo ""
    echo "📋 Service Account Status:"
    curl -s "$DEBUG_URL" | grep -o '"isConfigured":[^,]*' || echo "   Unable to check service account status"
else
    echo "❌ Debug endpoint failed (HTTP $DEBUG_RESPONSE)"
fi

echo ""
echo "🎉 Deployment Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Function deployed to Supabase"
echo "📍 Health: $HEALTH_URL"  
echo "📍 Debug: $DEBUG_URL"
echo ""
echo "🔧 Next steps:"
echo "1. Set environment variables in Supabase dashboard"
echo "2. Test the debug endpoint to verify service account"
echo "3. Test CSV endpoint with your Google Sheets URL"
echo ""
echo "🔗 Supabase Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF"
EOF

chmod +x deploy_on2cook.sh

# Create verification script
cat > verify_on2cook.sh << 'EOF'
#!/bin/bash

PROJECT_REF="wpnshiyspzpnnfmomegm"
FUNCTION_NAME="make-server-3005c377"
BASE_URL="https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME"

echo "🔍 Verifying On2Cook deployment..."

# Test all endpoints
echo "1️⃣ Health Check:"
curl -s "$BASE_URL/health" | head -3

echo ""
echo "2️⃣ Service Account Debug:"
curl -s "$BASE_URL/debug-service-account" | head -5

echo ""  
echo "3️⃣ CSV Data Test:"
CSV_URL="$BASE_URL/csv/data?demoRequestsCsvUrl=https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455"
curl -s "$CSV_URL" | head -3

echo ""
echo "✅ Verification complete!"
echo "🔗 Full debug URL: $BASE_URL/debug-service-account"
EOF

chmod +x verify_on2cook.sh

echo ""
echo "🎉 Local project structure created successfully!"
echo ""
echo "📁 Created files:"
echo "   ├── supabase/functions/server/index.tsx (placeholder)"
echo "   ├── supabase/functions/server/googleSheetsServiceAccount.tsx (placeholder)" 
echo "   ├── supabase/functions/server/googleSheetsUpdater.tsx (placeholder)"
echo "   ├── supabase/functions/server/csvDataService.tsx (placeholder)"
echo "   ├── supabase/functions/server/kv_store.tsx (placeholder)"
echo "   ├── deploy_on2cook.sh (executable)"
echo "   └── verify_on2cook.sh (executable)"
echo ""
echo "🔧 Next steps:"
echo "1. Copy the real file contents from Figma Make environment"
echo "2. Replace the placeholder content in each .tsx file"
echo "3. Run: ./deploy_on2cook.sh"
echo "4. Set environment variables in Supabase dashboard"
echo "5. Run: ./verify_on2cook.sh"
echo ""
echo "⚠️  IMPORTANT: You must replace ALL placeholder content before deployment!"
EOF

chmod +x create_local_project.sh

echo "✅ Created create_local_project.sh script"