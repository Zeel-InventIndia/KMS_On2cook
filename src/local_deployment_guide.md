# Local Deployment Guide for On2Cook Server

Since you're working in Figma Make environment, you need to deploy from your local machine. Follow these steps:

## 📁 Step 1: Create Local Project Structure

Create these directories and files on your local machine:

```
your-project/
└── supabase/
    └── functions/
        └── server/
            ├── index.tsx
            ├── googleSheetsServiceAccount.tsx
            ├── googleSheetsUpdater.tsx
            ├── csvDataService.tsx
            └── kv_store.tsx
```

## 📝 Step 2: Copy File Contents

Copy the exact content from each file in this Figma Make environment to your local files:

### index.tsx
```typescript
// Copy the complete content from /supabase/functions/server/index.tsx
// (The large server file we reviewed earlier)
```

### googleSheetsServiceAccount.tsx  
```typescript
// Copy the complete content from /supabase/functions/server/googleSheetsServiceAccount.tsx
```

### googleSheetsUpdater.tsx
```typescript  
// Copy the complete content from /supabase/functions/server/googleSheetsUpdater.tsx
```

### csvDataService.tsx
```typescript
// Copy the content from the existing csvDataService.tsx file in your project
```

### kv_store.tsx
```typescript
// Copy the content from the existing kv_store.tsx file (this is protected, should already exist)
```

## 🚀 Step 3: Deploy Script

Create `deploy_on2cook.sh` locally:

```bash
#!/bin/bash

PROJECT_REF="wpnshiyspzpnnfmomegm"
FUNCTION_NAME="make-server-3005c377"

echo "🚀 Deploying On2Cook server to Supabase..."

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not installed. Run: npm install -g supabase"
    exit 1
fi

# Deploy
echo "📦 Deploying function..."
supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF

# Test endpoints
echo "🧪 Testing deployment..."
HEALTH_URL="https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME/health"
curl -s "$HEALTH_URL" | head -5

echo ""
echo "✅ Deployment complete!"
echo "🔗 Debug URL: https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_NAME/debug-service-account"
```

## ⚙️ Step 4: Set Environment Variables

**Supabase Dashboard Method:**
1. Go to: https://supabase.com/dashboard/project/wpnshiyspzpnnfmomegm
2. Settings → Edge Functions → Environment Variables
3. Add:
   - `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON`: Your complete service account JSON
   - `ON2COOK_SPREADSHEET_ID`: `1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM`

**CLI Method (alternative):**
```bash
# Set environment variables via CLI
supabase secrets set GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' --project-ref wpnshiyspzpnnfmomegm
supabase secrets set ON2COOK_SPREADSHEET_ID='1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM' --project-ref wpnshiyspzpnnfmomegm
```

## 🔍 Step 5: Verify Deployment  

Run these commands to test:

```bash
# Health check
curl "https://wpnshiyspzpnnfmomegm.supabase.co/functions/v1/make-server-3005c377/health"

# Service account debug
curl "https://wpnshiyspzpnnfmomegm.supabase.co/functions/v1/make-server-3005c377/debug-service-account"

# CSV data test
curl "https://wpnshiyspzpnnfmomegm.supabase.co/functions/v1/make-server-3005c377/csv/data?demoRequestsCsvUrl=https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455"
```

## 🎯 Expected Responses

**Health Check (should return 200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2024-...",
  "environment": {
    "hasServiceAccountJson": true,
    "hasOn2CookSpreadsheet": true
  }
}
```

**Debug Endpoint (should return service account info):**
```json
{
  "success": true,
  "debug": {
    "serviceAccount": {
      "email": "your-service-account@project.iam.gserviceaccount.com",
      "isConfigured": true
    },
    "sheetTest": {
      "result": { "success": true, "rowCount": 10 }
    }
  }
}
```

## 🔧 Troubleshooting

### 404 Error on Endpoints
- Function not deployed properly
- Check: `supabase functions list --project-ref wpnshiyspzpnnfmomegm`

### Service Account Errors  
- Environment variable not set correctly
- Check JSON format is valid
- Verify service account has Google Sheets API access

### CSV/Sheets Access Errors
- Check Google Sheets sharing permissions
- Verify spreadsheet ID is correct
- Ensure service account email has access to the sheet

## 📞 Support

If you encounter issues:
1. Check the Supabase function logs in the dashboard
2. Verify environment variables are set correctly  
3. Test the debug endpoint to diagnose service account issues
4. Ensure Google Sheets sharing permissions include the service account email