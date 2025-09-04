# On2Cook Server Deployment Instructions

## Prerequisites

1. **Supabase CLI installed and authenticated**
   ```bash
   # Install Supabase CLI if not already installed
   npm install -g supabase

   # Login to Supabase
   supabase login
   ```

2. **Google Service Account JSON**
   - Create a Google Service Account with Google Sheets API access
   - Download the service account JSON file
   - Ensure the service account has proper permissions to your Google Sheets

## Step 1: Set Environment Variables

### Local Environment (for testing)
```bash
export GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"charged-state-470211-f0","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'

export ON2COOK_SPREADSHEET_ID='1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM'
```

### Supabase Dashboard (for production)
1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/wpnshiyspzpnnfmomegm
2. Navigate to **Settings** → **Edge Functions** → **Environment Variables**
3. Add the following variables:
   - `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON`: Full JSON string of your service account
   - `ON2COOK_SPREADSHEET_ID`: `1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM`

## Step 2: Deploy the Function

```bash
# Navigate to your project directory
cd /path/to/your/project

# Deploy the make-server-3005c377 function
supabase functions deploy make-server-3005c377 --project-ref wpnshiyspzpnnfmomegm

# Verify deployment
supabase functions list --project-ref wpnshiyspzpnnfmomegm
```

## Step 3: Test the Deployment

### Health Check
```bash
curl "https://wpnshiyspzpnnfmomegm.supabase.co/functions/v1/make-server-3005c377/health"
```

### Service Account Debug
```bash
curl "https://wpnshiyspzpnnfmomegm.supabase.co/functions/v1/make-server-3005c377/debug-service-account"
```

### Expected Response Format
```json
{
  "success": true,
  "debug": {
    "environment": {
      "hasServiceAccountJson": true,
      "serviceAccountJsonLength": 2000,
      "hasGoogleSheetsKey": false,
      "on2cookSpreadsheetId": "1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM"
    },
    "serviceAccount": {
      "email": "your-service-account@project.iam.gserviceaccount.com",
      "parseError": null,
      "isConfigured": true
    },
    "sheetTest": {
      "result": {
        "success": true,
        "rowCount": 10,
        "firstRow": ["Full name", "Email", "Phone Number", "Lead status", "Sales rep", "Assignee", "Demo date"],
        "sampleColumns": ["Full name", "Email", "Phone Number", "Lead status", "Sales rep"]
      },
      "error": null
    }
  },
  "timestamp": "2024-01-XX:XX:XX.XXXZ"
}
```

## Step 4: Troubleshooting Common Issues

### 404 Error on Debug Endpoint
- **Cause**: Function not deployed or wrong URL
- **Solution**: 
  1. Verify function is deployed: `supabase functions list --project-ref wpnshiyspzpnnfmomegm`
  2. Check the exact URL: `https://wpnshiyspzpnnfmomegm.supabase.co/functions/v1/make-server-3005c377/debug-service-account`

### Service Account Not Configured
- **Cause**: Missing or invalid GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON
- **Solution**: 
  1. Verify environment variable is set in Supabase dashboard
  2. Ensure JSON is valid and properly escaped
  3. Check service account has Google Sheets API enabled

### Sheet Access Denied
- **Cause**: Service account doesn't have access to the Google Sheet
- **Solution**:
  1. Share the Google Sheet with the service account email
  2. Grant "Editor" permissions to the service account
  3. Ensure the sheet is not private

### Invalid Spreadsheet ID
- **Cause**: Wrong spreadsheet ID in environment variable
- **Solution**: 
  1. Extract ID from Google Sheets URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
  2. Update ON2COOK_SPREADSHEET_ID environment variable

## Step 5: Verify Integration

### Test CSV Data Endpoint
```bash
curl "https://wpnshiyspzpnnfmomegm.supabase.co/functions/v1/make-server-3005c377/csv/data?demoRequestsCsvUrl=https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455"
```

### Test Google Sheets Update
```bash
curl -X PUT "https://wpnshiyspzpnnfmomegm.supabase.co/functions/v1/make-server-3005c377/demo-requests/test/sheets" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Test Client",
    "clientEmail": "test@example.com",
    "recipes": ["Test Recipe"],
    "notes": "Test update",
    "updatedBy": "Deployment Test"
  }'
```

## Key Files Updated

1. **`/supabase/functions/server/index.tsx`** - Main server file with all routes
2. **`/supabase/functions/server/googleSheetsServiceAccount.tsx`** - Service account authentication
3. **`/supabase/functions/server/googleSheetsUpdater.tsx`** - Google Sheets update operations

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` | Full JSON of Google Service Account | `{"type":"service_account",...}` |
| `ON2COOK_SPREADSHEET_ID` | Google Sheets ID for On2Cook data | `1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM` |
| `SUPABASE_URL` | Supabase project URL | Auto-provided |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Auto-provided |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Auto-provided |

## Security Notes

- ✅ **Service Account Required**: All Google Sheets operations now require service account authentication
- ✅ **No API Key Fallback**: Removed insecure API key fallbacks for write operations
- ✅ **Robust JWT Handling**: Proper RS256 signing with automatic token refresh
- ✅ **Error Validation**: Comprehensive validation of service account configuration

## Success Indicators

- [ ] Health endpoint returns 200 OK
- [ ] Debug endpoint shows service account configured
- [ ] Sheet test in debug endpoint returns data
- [ ] CSV data endpoint returns demo requests
- [ ] Google Sheets update operations work without errors