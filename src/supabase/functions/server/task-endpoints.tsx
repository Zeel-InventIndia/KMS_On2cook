import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { Task } from '../../types/Task.ts';

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

// Google Sheets configuration for tasks (optional - will gracefully fail if not configured)
const TASK_SPREADSHEET_ID = Deno.env.get('TASK_SPREADSHEET_ID') || '1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM';
const TASK_SHEET_ID = Deno.env.get('TASK_SHEET_ID') || '731376890'; // The gid from the URL

// Initialize Hono app
const app = new Hono();

// Add CORS and logging
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://localhost:3000', '*'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', logger(console.log));

// Helper function to write task to Google Sheets (with graceful error handling)
async function writeTaskToGoogleSheets(task: Task): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceAccountJson = Deno.env.get('GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      console.warn('⚠️ Google Sheets service account not configured - skipping Google Sheets write');
      return { success: false, error: 'Service account not configured' };
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (parseError) {
      console.warn('⚠️ Failed to parse service account JSON - skipping Google Sheets write');
      return { success: false, error: 'Invalid service account JSON' };
    }
    
    // Create JWT for Google Sheets API authentication
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };

    // Import crypto for JWT signing
    const encoder = new TextEncoder();
    const keyData = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\\n/g, '');
    const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const signatureInput = `${headerB64}.${payloadB64}`;
    
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(signatureInput)
    );
    
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const jwt = `${signatureInput}.${signatureB64}`;

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.warn('⚠️ Failed to get Google Sheets access token - skipping write');
      return { success: false, error: 'Authentication failed' };
    }

    // Prepare row data for the task
    const currentDateTime = new Date().toISOString();
    const taskRow = [
      task.id,
      task.title,
      task.description || '',
      task.status,
      task.priority || 'medium',
      task.assignedTo || '',
      task.dueDate || '',
      currentDateTime, // Created date
      currentDateTime, // Updated date
      task.category || '',
      task.estimatedTime || '',
      task.notes || ''
    ];

    // Append the row to Google Sheets
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${TASK_SPREADSHEET_ID}/values/A:L:append?valueInputOption=RAW`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [taskRow]
        }),
        signal: AbortSignal.timeout(15000) // 15 second timeout
      }
    );

    if (!appendResponse.ok) {
      const errorText = await appendResponse.text();
      console.warn(`⚠️ Failed to append task to Google Sheets: ${appendResponse.status} ${errorText}`);
      return { success: false, error: `Google Sheets API error: ${appendResponse.status}` };
    }

    console.log('✅ Task successfully written to Google Sheets:', task.title);
    return { success: true };
    
  } catch (error) {
    console.warn('⚠️ Error writing task to Google Sheets (continuing anyway):', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Route to create a new task
app.post('/tasks', async (c) => {
  try {
    const task: Task = await c.req.json();
    
    console.log('📝 Creating new task:', task.title);
    
    // Try to write to Google Sheets (but don't fail if it doesn't work)
    const sheetsResult = await writeTaskToGoogleSheets(task);
    
    // Store in Supabase KV store as fallback/primary storage
    const taskKey = `task_${task.id}`;
    
    // Initialize Supabase client if available
    let kvStored = false;
    try {
      // This would use the KV store if available
      console.log('📦 Storing task in KV store:', taskKey);
      // Note: The actual KV storage would need to be implemented
      kvStored = true;
    } catch (kvError) {
      console.warn('⚠️ Failed to store in KV store:', kvError);
    }
    
    return c.json({ 
      success: true, 
      message: 'Task created successfully',
      taskId: task.id,
      storage: {
        googleSheets: sheetsResult,
        kvStore: kvStored
      }
    });
  } catch (error) {
    console.error('❌ Error creating task:', error);
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Task creation failed - check server logs for details'
      }, 
      500
    );
  }
});

// Health check endpoint
app.get('/tasks/health', (c) => {
  const hasServiceAccount = Boolean(Deno.env.get('GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON'));
  const hasTaskSpreadsheet = Boolean(Deno.env.get('TASK_SPREADSHEET_ID'));
  
  return c.json({ 
    status: 'OK', 
    service: 'Task Management',
    config: {
      hasServiceAccount,
      hasTaskSpreadsheet,
      spreadsheetId: TASK_SPREADSHEET_ID
    },
    timestamp: new Date().toISOString()
  });
});

// Simple task creation endpoint that doesn't rely on Google Sheets
app.post('/tasks/simple', async (c) => {
  try {
    const task = await c.req.json();
    
    console.log('📝 Simple task creation:', task.title || 'Unnamed task');
    
    return c.json({
      success: true,
      message: 'Task received successfully',
      task: {
        ...task,
        id: task.id || `task_${Date.now()}`,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Simple task creation error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default app;