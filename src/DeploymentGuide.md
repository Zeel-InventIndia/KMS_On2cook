# On2Cook Server Deployment Guide

## Overview
This guide will help you deploy the updated server code to Supabase to fix the Dropbox endpoints that are currently showing "Unexpected response: 200" and other issues.

## Prerequisites
1. Supabase CLI installed and configured
2. Access to your Supabase project
3. Updated server code with proper Dropbox functionality

## Current Issues
- Dropbox endpoints returning "Unexpected response: 200"
- Possible incomplete server code deployment
- Missing proper error handling for Dropbox API calls

## Deployment Steps

### Step 1: Verify Supabase CLI Setup
```bash
# Check if Supabase CLI is installed
supabase --version

# Login to Supabase (if not already logged in)
supabase login

# Link to your project (if not already linked)
supabase link --project-ref [YOUR_PROJECT_REF]
```

### Step 2: Deploy the Updated Edge Function
```bash
# Navigate to your project root
cd /path/to/your/on2cook-project

# Deploy the server function to Supabase
supabase functions deploy server --project-ref [YOUR_PROJECT_REF]
```

### Step 3: Verify Environment Variables
Ensure these environment variables are properly set in your Supabase project:

**Required Variables:**
- `DROPBOX_ACCESS_TOKEN` - Your Dropbox access token
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `GOOGLE_SHEETS_API_KEY` - Your Google Sheets API key
- `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` - Your service account JSON
- `ON2COOK_SPREADSHEET_ID` - Your Google Sheets spreadsheet ID

### Step 4: Test the Deployment
After deployment, test the endpoints:

1. **Health Check:**
   ```
   GET https://[PROJECT_ID].supabase.co/functions/v1/make-server-3005c377/health
   ```

2. **Dropbox Token Test:**
   ```
   POST https://[PROJECT_ID].supabase.co/functions/v1/make-server-3005c377/dropbox/test-token
   Content-Type: application/json
   Authorization: Bearer [YOUR_ANON_KEY]
   
   {
     "token": "your_dropbox_token_here"
   }
   ```

3. **Dropbox Folder Creation:**
   ```
   POST https://[PROJECT_ID].supabase.co/functions/v1/make-server-3005c377/dropbox/create-folder
   Content-Type: application/json
   Authorization: Bearer [YOUR_ANON_KEY]
   
   {
     "folderName": "test-folder"
   }
   ```

## Troubleshooting

### Common Issues:

1. **"Unexpected response: 200"**
   - This usually indicates the server is responding but with unexpected content
   - Check the server logs in Supabase dashboard
   - Verify the endpoint URLs are correct

2. **Environment Variables Not Found**
   - Verify all required environment variables are set in Supabase
   - Check for typos in variable names
   - Ensure service account JSON is properly formatted

3. **Import Errors**
   - Verify all imported files exist in the server directory
   - Check for syntax errors in TypeScript files
   - Ensure proper Deno import statements

4. **Dropbox API Errors**
   - Verify your Dropbox access token is valid
   - Check token permissions and scopes
   - Ensure proper JSON formatting in API calls

### Checking Logs:
1. Go to your Supabase dashboard
2. Navigate to Edge Functions → server
3. Check the "Logs" tab for detailed error messages

## Deployment Verification Checklist

- [ ] Supabase CLI is properly configured
- [ ] All environment variables are set correctly
- [ ] Server function deploys without errors
- [ ] Health check endpoint returns success
- [ ] Dropbox endpoints respond correctly
- [ ] Google Sheets integration works
- [ ] CSV data endpoints function properly

## Alternative Deployment Method

If the CLI deployment fails, you can also:

1. **Manual Deployment via Supabase Dashboard:**
   - Go to Edge Functions in your Supabase dashboard
   - Delete the existing "server" function if it exists
   - Create a new function named "server"
   - Copy and paste the complete server code
   - Deploy the function

2. **Using GitHub Integration:**
   - Push your code to a GitHub repository
   - Connect your Supabase project to the repository
   - Enable automatic deployments

## Post-Deployment Testing

After successful deployment, test the full workflow:

1. Login to your On2Cook application
2. Navigate to a demo that needs media upload
3. Try uploading files to Dropbox
4. Verify the files appear in your Dropbox account
5. Check that the media links are properly stored

## Support

If you encounter issues during deployment:

1. Check the Supabase Edge Function logs
2. Verify all environment variables are correctly set
3. Test individual endpoints using a tool like Postman
4. Review the server code for any missing imports or syntax errors

The key issue is likely that the server code needs to be completely redeployed with the latest fixes for proper JSON handling in Dropbox API calls and improved error recovery.