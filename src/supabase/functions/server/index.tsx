import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { fetchCsvData } from './csvDataService.tsx';
import { googleSheetsUpdater } from './googleSheetsUpdater.tsx';
import { googleSheetsService } from './googleSheetsServiceAccount.tsx';
import { googleSheetsServiceFixed } from './googleSheetsServiceAccountFixed.tsx';
import taskManagement from './task-management.tsx';

// Recipe and storage imports (existing functionality)
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Configure CORS for all routes
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Add request logging
app.use('*', logger(console.log));

// Mount task management routes
app.route('/', taskManagement);

// CSV Data Fetching Endpoint
app.get('/make-server-3005c377/csv-data', async (c) => {
  try {
    console.log('📊 CSV data fetch requested');
    
    const url = c.req.query('url') || 'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=0';
    
    console.log('📊 Attempting CSV data fetch from:', url);
    
    // Try to fetch CSV data with multiple fallback methods
    try {
      const result = await fetchCsvData(url);
      console.log(`✅ CSV data fetch successful: ${result.demoRequests.length} demo requests, ${result.tasks.length} tasks`);
      
      return c.json({
        success: true,
        data: result,
        source: 'csv_direct',
        timestamp: new Date().toISOString()
      });
      
    } catch (csvError) {
      console.error('❌ CSV fetch failed:', csvError);
      
      // If CSV fails and we have service account, try that
      const googleServiceAccountJson = Deno.env.get('GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON');
      if (googleServiceAccountJson) {
        try {
          console.log('📊 Trying service account fallback for both sheets...');
          const on2cookSpreadsheetId = '1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM';
          
          // Fetch from Demo_schedule sheet
          let demoRequests = [];
          try {
            const demoSheetData = await googleSheetsService.fetchSheetData(on2cookSpreadsheetId, 'Demo_schedule');
            demoRequests = demoSheetData.slice(1).map((row, index) => ({
              id: `sheet-demo-${index + 1}`,
              clientName: row[0] || '',
              clientEmail: row[1] || '',
              clientMobile: row[2] || '',
              leadStatus: row[3] || 'demo_planned',
              salesRep: row[4] || '',
              assignee: row[5] || '',
              demoDate: row[6] || new Date().toISOString().split('T')[0],
              demoTime: '10:00 AM',
              recipes: [],
              type: 'demo',
              demoMode: 'onsite',
              status: 'pending',
              statusChangedAt: new Date().toISOString(),
              assignedMembers: [],
              source: 'demo_schedule'
            })).filter(req => req.clientName && req.assignee);
            console.log(`✅ Demo_schedule sheet: ${demoRequests.length} requests`);
          } catch (demoError) {
            console.warn('⚠️ Demo_schedule sheet fetch failed:', demoError);
          }
          
          // Fetch from kitchen_request sheet (optional - may not exist yet)
          let kitchenRequests = [];
          try {
            console.log('🍳 Attempting to fetch kitchen_request sheet...');
            const kitchenSheetData = await googleSheetsService.fetchSheetData(on2cookSpreadsheetId, 'kitchen_request');
            if (kitchenSheetData && kitchenSheetData.length > 1) {
              kitchenRequests = kitchenSheetData.slice(1).map((row, index) => ({
                id: `sheet-kitchen-${index + 1}`,
                clientName: row[0] || '',
                clientEmail: row[1] || '',
                clientMobile: row[2] || '',
                demoDate: row[3] || new Date().toISOString().split('T')[0],
                demoMode: row[4] || 'onsite',
                leadStatus: row[5] || 'demo_planned',
                salesRep: row[6] || '',
                assignee: row[7] || '',
                demoTime: '10:00 AM',
                recipes: [],
                type: 'demo',
                status: 'pending',
                statusChangedAt: new Date().toISOString(),
                assignedMembers: [],
                source: 'kitchen_request',
                createdBy: row[8] || 'head_chef',
                createdAt: row[9] || new Date().toISOString()
              })).filter(req => req.clientName && req.clientEmail);
              console.log(`✅ kitchen_request sheet: ${kitchenRequests.length} requests`);
            } else {
              console.log('📄 kitchen_request sheet exists but has no data rows');
            }
          } catch (kitchenError) {
            const errorMsg = kitchenError instanceof Error ? kitchenError.message : 'Unknown error';
            if (errorMsg.includes('Unable to parse range') || errorMsg.includes('not found')) {
              console.log('📄 kitchen_request sheet does not exist yet - this is normal for new installations');
            } else {
              console.warn('⚠️ kitchen_request sheet fetch failed:', errorMsg);
            }
          }
          
          // Combine both sets of requests
          const allRequests = [...demoRequests, ...kitchenRequests];
          console.log(`✅ Service account fallback successful: ${allRequests.length} total requests (${demoRequests.length} demo + ${kitchenRequests.length} kitchen)`);
          
          return c.json({
            success: true,
            data: {
              demoRequests: allRequests,
              tasks: []
            },
            source: 'service_account_fallback_dual_sheet',
            timestamp: new Date().toISOString()
          });
          
        } catch (serviceError) {
          console.error('❌ Service account fallback also failed:', serviceError);
        }
      }
      
      // Both methods failed - return error with helpful info
      throw csvError;
    }
    
  } catch (error) {
    console.error('💥 CSV data endpoint error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallbackAvailable: false,
      suggestions: [
        'Check if the Google Sheets URL is correct and accessible',
        'Ensure the spreadsheet is shared as "Anyone with the link can view"',
        'Verify the service account is properly configured if using private sheets',
        'Check network connectivity'
      ],
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Demo Request Management Endpoints

// Add head chef-generated request to kitchen_request sheet
app.post('/make-server-3005c377/kitchen-requests', async (c) => {
  try {
    console.log('📝 Kitchen request creation received from head chef');
    const body = await c.req.json();
    
    console.log('📝 Kitchen request details:', {
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      clientMobile: body.clientMobile,
      demoDate: body.demoDate,
      demoMode: body.demoMode,
      createdBy: body.createdBy
    });

    // Validate required fields
    if (!body.clientName || !body.clientEmail || !body.demoDate) {
      return c.json({
        success: false,
        error: 'Client name, email, and demo date are required'
      }, 400);
    }

    // Prepare data for the specific kitchen request sheet (gid=731376890)
    // Expected columns: Full Name, Email, Phone Number, Demo Date, Demo Mode, Lead Status, Sales Rep, Assignee, Created By, Created At
    const requestData = [
      body.clientName,
      body.clientEmail,
      body.clientMobile || '',
      body.demoDate,
      body.demoMode || 'onsite',
      'demo_planned', // Default status
      '', // Sales rep (empty for head chef requests)
      '', // Assignee (empty, will be assigned later)
      body.createdBy || 'head_chef',
      new Date().toISOString()
    ];
    
    console.log('📊 Request data prepared for Google Sheets:', {
      targetGid: 731376890,
      data: requestData,
      expectedColumns: [
        'Full Name', 'Email', 'Phone Number', 'Demo Date', 
        'Demo Mode', 'Lead Status', 'Sales Rep', 'Assignee', 
        'Created By', 'Created At'
      ]
    });

    // Try to append to kitchen_request sheet
    let sheetsResult = null;
    try {
      console.log('📊 Attempting to add request to kitchen_request sheet (gid=731376890)...');
      
      const on2cookSpreadsheetId = '1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM';
      
      // Check if service account is configured
      if (!googleSheetsServiceFixed.isServiceAccountConfigured()) {
        throw new Error('Service account not configured for kitchen requests. Please configure GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON environment variable.');
      }
      
      // Get access token for Google Sheets API
      let accessToken;
      try {
        accessToken = await googleSheetsServiceFixed.getAccessToken();
      } catch (authError) {
        console.error('❌ Failed to get access token:', authError);
        throw new Error(`Authentication failed: ${authError instanceof Error ? authError.message : 'Unknown auth error'}`);
      }
      
      // Get the sheet name that corresponds to gid=731376890
      let sheetName = 'kitchen_request';
      try {
        // Get spreadsheet metadata to find the sheet name for gid=731376890
        const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${on2cookSpreadsheetId}?fields=sheets.properties`;
        const metadataResponse = await fetch(metadataUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          signal: AbortSignal.timeout(10000)
        });
        
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          console.log('📊 Spreadsheet metadata:', metadata);
          
          // Find the sheet with gid=731376890
          const targetGid = 731376890;
          const targetSheet = metadata.sheets?.find((sheet: any) => 
            sheet.properties?.sheetId === targetGid
          );
          
          if (targetSheet) {
            sheetName = targetSheet.properties.title;
            console.log(`✅ Found sheet name for gid=${targetGid}: "${sheetName}"`);
          } else {
            console.log(`⚠️ Sheet with gid=${targetGid} not found, using default: "${sheetName}"`);
            // List available sheets for debugging
            const availableSheets = metadata.sheets?.map((sheet: any) => ({
              name: sheet.properties?.title,
              gid: sheet.properties?.sheetId
            })) || [];
            console.log('📋 Available sheets:', availableSheets);
          }
        } else {
          console.log('⚠️ Failed to fetch spreadsheet metadata, using default sheet name');
        }
      } catch (metadataError) {
        console.log('⚠️ Error fetching sheet metadata, using default sheet name:', metadataError);
      }
      
      // Use the append API to add a new row to the specific sheet
      console.log(`📊 Using sheet name: "${sheetName}" for data append`);
      const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${on2cookSpreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [requestData]
        }),
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Kitchen request sheet append failed:', response.status, errorText);
        
        // Check if the error is due to the sheet not existing
        if (response.status === 400 && (errorText.includes('Unable to parse range') || errorText.includes(sheetName))) {
          throw new Error(`The sheet "${sheetName}" does not exist in the spreadsheet. Please create a sheet with this name in your Google Spreadsheet (gid=731376890) with headers: Full Name, Email, Phone Number, Demo Date, Demo Mode, Lead Status, Sales Rep, Assignee, Created By, Created At`);
        } else {
          throw new Error(`Failed to add request to "${sheetName}" sheet: ${response.status} ${errorText}`);
        }
      }
      
      const result = await response.json();
      sheetsResult = {
        success: true,
        updatedRange: result.updates?.updatedRange,
        updatedRows: result.updates?.updatedRows
      };
      
      console.log('✅ Kitchen request added to Google Sheets successfully:', {
        sheet: sheetName,
        range: result.updates?.updatedRange,
        rows: result.updates?.updatedRows,
        data: requestData
      });
      
    } catch (sheetsError) {
      console.error('💥 Kitchen request Google Sheets error:', sheetsError);
      sheetsResult = {
        success: false,
        error: sheetsError instanceof Error ? sheetsError.message : 'Unknown sheets error'
      };
    }

    // Store in KV store for persistence and frontend access
    const requestId = `kitchen_request_${Date.now()}`;
    const fullRequestData = {
      id: requestId,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      clientMobile: body.clientMobile || '',
      demoDate: body.demoDate,
      demoMode: body.demoMode || 'onsite',
      leadStatus: 'demo_planned',
      salesRep: '',
      assignee: '',
      recipes: [],
      type: 'demo',
      status: 'pending',
      statusChangedAt: new Date().toISOString(),
      assignedMembers: [],
      createdBy: body.createdBy || 'head_chef',
      createdAt: new Date().toISOString(),
      source: 'kitchen_request'
    };

    await kv.set(requestId, fullRequestData);

    console.log('✅ Kitchen request creation completed');

    return c.json({
      success: true,
      message: 'Kitchen request created successfully',
      data: fullRequestData,
      backend: {
        kvStored: true,
        sheetsUpdate: sheetsResult
      }
    });

  } catch (error) {
    console.error('💥 Error creating kitchen request:', error);
    return c.json({
      success: false,
      error: 'Failed to create kitchen request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Update demo request (for recipes by presales team and team assignments by head chef)
app.put('/make-server-3005c377/demo-requests/:id', async (c) => {
  try {
    console.log('📝 Demo request update received');
    const requestId = c.req.param('id');
    const body = await c.req.json();
    
    console.log('📝 Request details:', {
      id: requestId,
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      assignedTeam: body.assignedTeam,
      assignedSlot: body.assignedSlot,
      assignedMember: body.assignedMember,
      recipesCount: body.recipes?.length || 0,
      updatedBy: body.updatedBy
    });

    if (!body.clientName || !body.clientEmail) {
      return c.json({
        success: false,
        error: 'Client name and email are required for identifying the row'
      }, 400);
    }

    // Store in KV store for persistence
    const kvKey = `demo_request_${requestId}`;
    await kv.set(kvKey, {
      ...body,
      updatedAt: new Date().toISOString(),
      lastModifiedBy: body.updatedBy || 'system'
    });

    // Try to update Google Sheets if we have team assignment data
    let sheetsUpdateResult = null;
    if (body.assignedTeam !== undefined || body.assignedSlot !== undefined || body.recipes) {
      try {
        console.log('📊 Attempting Google Sheets update...');
        
        // Prepare update data for Google Sheets
        const updateData = {
          clientName: body.clientName,
          clientEmail: body.clientEmail
        };

        // Add recipes if provided
        if (body.recipes && Array.isArray(body.recipes)) {
          updateData.recipes = body.recipes;
        }

        // Add team assignment info with ALL team members
        if (body.assignedTeam !== undefined || body.assignedSlot !== undefined || body.assignedMembers) {
          const teamInfo = [];
          
          // Include ALL assigned team members if available
          if (body.assignedMembers && Array.isArray(body.assignedMembers) && body.assignedMembers.length > 0) {
            // Write all team member names to Google Sheets Column I
            const allMembers = body.assignedMembers.join(', ');
            if (body.assignedSlot) {
              updateData.teamMember = `${allMembers} | ${body.assignedSlot}`;
            } else {
              updateData.teamMember = allMembers;
            }
            teamInfo.push(`Members: ${allMembers}`);
          } else if (body.assignedMember) {
            // Fallback to single member for backward compatibility
            if (body.assignedSlot) {
              updateData.teamMember = `${body.assignedMember} | ${body.assignedSlot}`;
            } else {
              updateData.teamMember = body.assignedMember;
            }
            teamInfo.push(`Member: ${body.assignedMember}`);
          }
          
          if (body.assignedTeam !== undefined) {
            teamInfo.push(`Team: ${body.assignedTeam}`);
          }
          if (body.assignedSlot !== undefined) {
            teamInfo.push(`Slot: ${body.assignedSlot}`);
          }
          updateData.notes = teamInfo.join(', ');
        }

        const sheetsResult = await googleSheetsUpdater.updateDemoRequest(updateData);
        sheetsUpdateResult = sheetsResult;

        if (sheetsResult.success) {
          console.log('✅ Google Sheets updated successfully');
        } else {
          console.warn('⚠️ Google Sheets update failed:', sheetsResult.error);
        }
      } catch (sheetsError) {
        console.error('💥 Google Sheets update error:', sheetsError);
        sheetsUpdateResult = {
          success: false,
          error: sheetsError instanceof Error ? sheetsError.message : 'Unknown sheets error'
        };
      }
    }

    console.log('✅ Demo request update completed');

    return c.json({
      success: true,
      message: 'Demo request updated successfully',
      data: {
        id: requestId,
        clientName: body.clientName,
        assignedTeam: body.assignedTeam,
        assignedSlot: body.assignedSlot,
        assignedMembers: body.assignedMembers,
        updatedBy: body.updatedBy,
        updatedAt: new Date().toISOString()
      },
      backend: {
        kvStored: true,
        sheetsUpdate: sheetsUpdateResult
      }
    });

  } catch (error) {
    console.error('💥 Error updating demo request:', error);
    return c.json({
      success: false,
      error: 'Failed to update demo request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get demo request by ID
app.get('/make-server-3005c377/demo-requests/:id', async (c) => {
  try {
    const requestId = c.req.param('id');
    const kvKey = `demo_request_${requestId}`;
    
    const demoRequest = await kv.get(kvKey);
    
    if (!demoRequest) {
      return c.json({
        success: false,
        error: 'Demo request not found'
      }, 404);
    }

    return c.json({
      success: true,
      data: demoRequest
    });

  } catch (error) {
    console.error('💥 Error fetching demo request:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch demo request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Service account diagnostics endpoint
app.get('/make-server-3005c377/debug-service-account-detailed', async (c) => {
  console.log('🔍 Detailed service account diagnostics requested');
  
  try {
    const googleServiceAccountJson = Deno.env.get('GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON');
    
    if (!googleServiceAccountJson) {
      return c.json({
        success: false,
        error: 'GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON environment variable not found',
        solution: 'Please configure the service account JSON in environment variables',
        timestamp: new Date().toISOString()
      });
    }
    
    // Test JSON parsing
    let credentials = null;
    let parseError = null;
    try {
      credentials = JSON.parse(googleServiceAccountJson);
      console.log('✅ Service account JSON parsed successfully');
    } catch (error) {
      parseError = error instanceof Error ? error.message : 'Unknown parse error';
      console.error('❌ Service account JSON parse failed:', parseError);
    }
    
    // Test JWT creation with fixed service account
    let jwtTestResult = null;
    let jwtTestError = null;
    if (credentials) {
      try {
        const testResult = await googleSheetsServiceFixed.testServiceAccountAuth();
        jwtTestResult = testResult;
        console.log('✅ JWT test result:', testResult);
      } catch (error) {
        jwtTestError = error instanceof Error ? error.message : 'Unknown JWT error';
        console.error('❌ JWT test failed:', jwtTestError);
      }
    }
    
    return c.json({
      success: true,
      diagnostics: {
        environment: {
          hasServiceAccountJson: Boolean(googleServiceAccountJson),
          jsonLength: googleServiceAccountJson?.length || 0
        },
        parsing: {
          success: !!credentials,
          error: parseError,
          hasRequiredFields: credentials ? {
            client_email: !!credentials.client_email,
            private_key: !!credentials.private_key,
            project_id: !!credentials.project_id,
            token_uri: !!credentials.token_uri
          } : null,
          privateKeyFormat: credentials?.private_key ? {
            hasBeginMarker: credentials.private_key.includes('BEGIN PRIVATE KEY'),
            hasEscapedNewlines: credentials.private_key.includes('\\n'),
            length: credentials.private_key.length
          } : null
        },
        authentication: {
          jwtTest: jwtTestResult,
          jwtError: jwtTestError
        }
      },
      recommendations: credentials ? [
        credentials.private_key?.includes('\\n') ? 
          '✅ Private key has escaped newlines (normal for JSON format)' : 
          '⚠️ Private key may need proper newline escaping',
        jwtTestResult?.success ? 
          '✅ JWT authentication working' : 
          '❌ JWT authentication failing - check private key format',
        '💡 If JWT errors persist, regenerate the service account key in Google Cloud Console'
      ] : [
        '❌ Service account JSON not parseable',
        '💡 Regenerate service account credentials in Google Cloud Console',
        '💡 Ensure JSON is properly formatted and escaped'
      ],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Service account diagnostics error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Debug service account endpoint
app.get('/make-server-3005c377/debug-service-account', async (c) => {
  console.log('🔍 Service account debug requested');
  
  try {
    const googleServiceAccountJson = Deno.env.get('GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON');
    const googleSheetsKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    const on2cookSpreadsheetId = Deno.env.get('ON2COOK_SPREADSHEET_ID') || '1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM';
    
    // Test service account parsing
    let serviceAccountEmail = null;
    let serviceAccountParseError = null;
    if (googleServiceAccountJson) {
      try {
        const parsed = JSON.parse(googleServiceAccountJson);
        serviceAccountEmail = parsed.client_email;
      } catch (error) {
        serviceAccountParseError = error.message;
      }
    }
    
    // Test direct sheet access with service account - try both implementations
    let sheetTestResult = null;
    let sheetTestError = null;
    let fixedServiceTestResult = null;
    let fixedServiceTestError = null;
    
    // Only test service account if we have credentials
    if (googleServiceAccountJson) {
      // Test original service account implementation
      try {
        console.log('🧪 Testing original service account sheet access...');
        
        let testData;
        try {
          testData = await googleSheetsService.fetchSheetData(on2cookSpreadsheetId, 'Demo_schedule!A1:G10');
        } catch (rangeError) {
          console.log('🧪 Range fetch failed, trying sheet name only...');
          testData = await googleSheetsService.fetchSheetData(on2cookSpreadsheetId, 'Demo_schedule');
        }
        
        sheetTestResult = {
          success: true,
          implementation: 'original',
          rowCount: testData.length,
          firstRow: testData[0] || null,
          sampleColumns: testData[0]?.slice(0, 5) || null
        };
        console.log('✅ Original service account test successful:', sheetTestResult);
      } catch (error) {
        sheetTestError = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Original service account test failed:', sheetTestError);
      }
    } else {
      sheetTestError = 'Service account credentials not configured';
      console.log('⚠️ Skipping service account test - no credentials');
    }
    
    // Test fixed service account implementation (if credentials are available)
    if (googleServiceAccountJson) {
      try {
        console.log('🧪 Testing fixed service account sheet access...');
        
        let testData;
        try {
          testData = await googleSheetsServiceFixed.fetchSheetData(on2cookSpreadsheetId, 'Demo_schedule!A1:G10');
        } catch (rangeError) {
          console.log('🧪 Range fetch failed, trying sheet name only...');
          testData = await googleSheetsServiceFixed.fetchSheetData(on2cookSpreadsheetId, 'Demo_schedule');
        }
        
        fixedServiceTestResult = {
          success: true,
          implementation: 'fixed',
          rowCount: testData.length,
          firstRow: testData[0] || null,
          sampleColumns: testData[0]?.slice(0, 5) || null
        };
        console.log('✅ Fixed service account test successful:', fixedServiceTestResult);
      } catch (error) {
        fixedServiceTestError = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Fixed service account test failed:', fixedServiceTestError);
      }
    } else {
      fixedServiceTestError = 'Service account credentials not configured';
      console.log('⚠️ Skipping fixed service account test - no credentials');
    }
    
    return c.json({
      success: true,
      debug: {
        environment: {
          hasServiceAccountJson: Boolean(googleServiceAccountJson),
          serviceAccountJsonLength: googleServiceAccountJson?.length || 0,
          hasGoogleSheetsKey: Boolean(googleSheetsKey),
          on2cookSpreadsheetId: on2cookSpreadsheetId
        },
        serviceAccount: {
          email: serviceAccountEmail,
          parseError: serviceAccountParseError,
          isConfigured: googleSheetsService.isServiceAccountConfigured()
        },
        sheetTest: {
          original: {
            result: sheetTestResult,
            error: sheetTestError
          },
          fixed: {
            result: fixedServiceTestResult,
            error: fixedServiceTestError
          },
          recommendation: fixedServiceTestResult ? 'Use fixed service account implementation' : 
                         sheetTestResult ? 'Use original service account implementation' : 
                         'Service account authentication not working - check credentials'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Debug endpoint error:', error);
    return c.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Health check endpoint
app.get('/make-server-3005c377/health', (c) => {
  console.log('🏥 Health check requested');
  
  // Check environment variables
  const dropboxToken = Deno.env.get('DROPBOX_ACCESS_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const googleSheetsKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
  const googleServiceAccountJson = Deno.env.get('GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON');
  const on2cookSpreadsheetId = Deno.env.get('ON2COOK_SPREADSHEET_ID') || '1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM';
  
  const hasDropboxToken = Boolean(dropboxToken);
  const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);
  const hasGoogleSheetsKey = Boolean(googleSheetsKey);
  const hasGoogleServiceAccount = Boolean(googleServiceAccountJson);
  
  console.log('🔍 Environment check:', {
    hasDropboxToken,
    hasSupabaseConfig,
    hasGoogleSheetsKey,
    hasGoogleServiceAccount,
    hasOn2CookSpreadsheet: Boolean(on2cookSpreadsheetId),
    dropboxTokenLength: dropboxToken ? dropboxToken.length : 0,
    googleSheetsKeyLength: googleSheetsKey ? googleSheetsKey.length : 0,
    googleServiceAccountLength: googleServiceAccountJson ? googleServiceAccountJson.length : 0
  });
  
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    serverInfo: {
      serverRunning: true,
      serverType: 'Supabase Edge Function',
      runtime: 'Deno',
      endpoint: '/make-server-3005c377/health'
    },
    environment: {
      hasDropboxToken,
      hasSupabaseConfig,
      hasGoogleSheetsKey,
      hasGoogleServiceAccount,
      hasOn2CookSpreadsheet: Boolean(on2cookSpreadsheetId),
      on2cookSpreadsheetId: on2cookSpreadsheetId,
      dropboxTokenLength: dropboxToken ? dropboxToken.length : 0,
      googleSheetsKeyLength: googleSheetsKey ? googleSheetsKey.length : 0,
      googleServiceAccountLength: googleServiceAccountJson ? googleServiceAccountJson.length : 0
    },
    routing: {
      availableEndpoints: [
        '/make-server-3005c377/health',
        '/make-server-3005c377/debug-service-account',
        '/make-server-3005c377/debug-service-account-detailed',
        '/make-server-3005c377/dropbox/self-test',
        '/make-server-3005c377/dropbox/debug-formdata',
        '/make-server-3005c377/dropbox/upload-simple',
        '/make-server-3005c377/dropbox/upload-batch',
        '/make-server-3005c377/dropbox/upload-batch-enhanced',
        '/make-server-3005c377/grid/update-coordinates',
        '/make-server-3005c377/grid/get-all-coordinates'
      ]
    }
  });
});

// Routing test endpoint to verify server is receiving requests correctly
app.get('/make-server-3005c377/test-routing', (c) => {
  console.log('🧪 Routing test requested');
  
  return c.json({
    success: true,
    message: 'Server routing is working correctly',
    requestInfo: {
      method: c.req.method,
      url: c.req.url,
      path: c.req.path,
      timestamp: new Date().toISOString()
    },
    serverInfo: {
      runtime: 'Deno Edge Function',
      framework: 'Hono',
      correctEndpoint: true
    }
  });
});

app.post('/make-server-3005c377/test-routing', (c) => {
  console.log('🧪 POST Routing test requested');
  
  return c.json({
    success: true,
    message: 'Server POST routing is working correctly',
    requestInfo: {
      method: c.req.method,
      url: c.req.url,
      path: c.req.path,
      timestamp: new Date().toISOString()
    },
    serverInfo: {
      runtime: 'Deno Edge Function',
      framework: 'Hono',
      correctEndpoint: true,
      canHandlePOST: true
    }
  });
});

// Dropbox Token Management Endpoints

// Update Dropbox token
app.post('/make-server-3005c377/dropbox/update-token', async (c) => {
  try {
    console.log('🔑 Updating Dropbox token...');
    const body = await c.req.json();
    const { token, updatedBy } = body;
    
    if (!token || !token.trim()) {
      console.error('❌ No token provided');
      return c.json({
        error: 'Token is required',
        details: 'Please provide a valid Dropbox access token'
      }, 400);
    }
    
    // Validate token format (basic check)
    const tokenTrimmed = token.trim();
    if (tokenTrimmed.length < 20 || (!tokenTrimmed.startsWith('sl.') && !tokenTrimmed.includes('.'))) {
      console.error('❌ Invalid token format');
      return c.json({
        error: 'Invalid token format',
        details: 'Token appears to be in incorrect format'
      }, 400);
    }
    
    // Test the token with a simple Dropbox API call
    console.log('🧪 Testing token validity...');
    try {
      const testResponse = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenTrimmed}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(null), // Dropbox API expects empty or null body
        signal: AbortSignal.timeout(10000)
      });
      
      if (!testResponse.ok) {
        let errorText = 'Unknown error';
        try {
          errorText = await testResponse.text();
        } catch (textError) {
          console.error('❌ Failed to read error response:', textError);
        }
        console.error('❌ Token validation failed:', testResponse.status, errorText);
        return c.json({
          error: 'Invalid Dropbox token',
          details: `Token test failed with status ${testResponse.status}: ${errorText}`
        }, 401);
      }
      
      const accountInfo = await testResponse.json();
      console.log('✅ Token validation successful:', accountInfo.name?.display_name || 'Unknown user');
      
      // Store the token update info (since we can't update env vars directly)
      await kv.set('dropbox_token_update', {
        token: tokenTrimmed,
        updatedBy,
        updatedAt: new Date().toISOString(),
        accountInfo: {
          name: accountInfo.name?.display_name,
          email: accountInfo.email
        }
      });
      
      console.log('✅ Token update recorded successfully');
      
      return c.json({
        success: true,
        message: 'Token updated successfully',
        accountInfo: {
          name: accountInfo.name?.display_name,
          email: accountInfo.email
        },
        updatedBy,
        updatedAt: new Date().toISOString()
      });
      
    } catch (testError) {
      console.error('💥 Token test failed:', testError);
      return c.json({
        error: 'Token validation failed',
        details: testError instanceof Error ? testError.message : 'Unknown validation error'
      }, 400);
    }
    
  } catch (error) {
    console.error('💥 Error updating Dropbox token:', error);
    return c.json({
      error: 'Failed to update token',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Test Dropbox token
app.post('/make-server-3005c377/dropbox/test-token', async (c) => {
  try {
    console.log('🧪 Testing Dropbox token...');
    const body = await c.req.json();
    const { token } = body;
    
    if (!token || !token.trim()) {
      return c.json({
        error: 'Token is required',
        valid: false
      }, 400);
    }
    
    const tokenTrimmed = token.trim();
    
    // Test the token with Dropbox API
    const testResponse = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenTrimmed}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(null), // Dropbox API expects empty or null body
      signal: AbortSignal.timeout(10000)
    });
    
    if (!testResponse.ok) {
      let errorText = 'Unknown error';
      try {
        const errorData = await testResponse.json();
        errorText = errorData.error_summary || errorData.error || errorText;
      } catch (jsonError) {
        try {
          errorText = await testResponse.text();
        } catch (textError) {
          console.error('❌ Failed to read error response:', textError);
        }
      }
      console.error('❌ Token test failed:', testResponse.status, errorText);
      
      return c.json({
        valid: false,
        error: `Invalid token: ${testResponse.status} ${testResponse.statusText}`,
        details: errorText,
        suggestion: testResponse.status === 401 ? 'Token appears to be expired or invalid. Please generate a new token from Dropbox App Console.' : undefined
      });
    }
    
    const accountInfo = await testResponse.json();
    console.log('✅ Token test successful:', accountInfo.name?.display_name || 'Unknown user');
    
    return c.json({
      valid: true,
      accountInfo: {
        name: accountInfo.name?.display_name,
        email: accountInfo.email
      }
    });
    
  } catch (error) {
    console.error('💥 Error testing token:', error);
    return c.json({
      valid: false,
      error: 'Token test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test Google Sheets URL endpoint
app.post('/make-server-3005c377/sheets/test-url', async (c) => {
  try {
    console.log('📊 Testing Google Sheets URL...');
    const body = await c.req.json();
    const { url } = body;
    
    if (!url || !url.trim()) {
      return c.json({
        success: false,
        error: 'URL is required'
      }, 400);
    }
    
    const urlTrimmed = url.trim();
    console.log(`📊 Testing URL: ${urlTrimmed}`);
    
    // Test the URL
    const testResponse = await fetch(urlTrimmed, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv,text/plain,*/*',
        'User-Agent': 'On2Cook-Server/1.0'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    console.log(`📊 Response: ${testResponse.status} ${testResponse.statusText}`);
    console.log(`📊 Content-Type: ${testResponse.headers.get('content-type')}`);
    
    if (!testResponse.ok) {
      let errorText = 'Unable to read error response';
      try {
        errorText = await testResponse.text();
      } catch (textError) {
        console.error('📊 Failed to read error response:', textError);
      }
      
      console.error('📊 URL test failed:', testResponse.status, errorText);
      
      return c.json({
        success: false,
        error: `HTTP ${testResponse.status}: ${testResponse.statusText}`,
        details: errorText.substring(0, 500),
        isHtml: errorText.includes('<!DOCTYPE html>') || errorText.includes('<html'),
        suggestion: errorText.includes('Sorry, unable to open the file') || errorText.includes('Page not found') 
          ? 'Spreadsheet appears to be private or not found. Please check sharing settings.'
          : undefined
      });
    }
    
    const responseText = await testResponse.text();
    const isHtml = responseText.includes('<!DOCTYPE html>') || 
                   responseText.includes('<html') ||
                   responseText.includes('Page not found');
    
    if (isHtml) {
      console.error('📊 URL returned HTML instead of CSV');
      return c.json({
        success: false,
        error: 'Google Sheets returned HTML page instead of CSV',
        details: 'This usually means the spreadsheet is not shared properly',
        isHtml: true,
        suggestion: 'Please ensure the spreadsheet is shared as "Anyone with the link can view"'
      });
    }
    
    // Basic CSV validation
    if (responseText.length < 50 || !responseText.includes(',')) {
      return c.json({
        success: false,
        error: 'Response does not appear to be valid CSV',
        details: `Response length: ${responseText.length}, contains commas: ${responseText.includes(',')}`,
        preview: responseText.substring(0, 200)
      });
    }
    
    // Parse CSV to check structure
    const lines = responseText.split('\n').filter(line => line.trim());
    const headers = lines[0]?.split(',') || [];
    
    console.log('✅ Google Sheets URL test successful');
    
    return c.json({
      success: true,
      message: 'Google Sheets URL is accessible and returns valid CSV',
      details: {
        responseLength: responseText.length,
        lineCount: lines.length,
        headerCount: headers.length,
        headers: headers.slice(0, 10), // First 10 headers
        preview: responseText.substring(0, 300)
      }
    });
    
  } catch (error) {
    console.error('💥 Error testing Google Sheets URL:', error);
    return c.json({
      success: false,
      error: 'URL test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Self-test endpoint that uses actual configured Dropbox token
app.post('/make-server-3005c377/dropbox/self-test', async (c) => {
  try {
    console.log('🧪 Running Dropbox self-test with configured token...');
    
    // Get the current token (try updated one first, then env var)
    let dropboxToken = Deno.env.get('DROPBOX_ACCESS_TOKEN');
    try {
      const tokenUpdate = await kv.get('dropbox_token_update');
      if (tokenUpdate && tokenUpdate.token) {
        dropboxToken = tokenUpdate.token;
        console.log('🔑 Using updated token from storage for self-test');
      }
    } catch (kvError) {
      console.log('🔑 Using environment token for self-test');
    }
    
    if (!dropboxToken) {
      return c.json({
        success: false,
        dropboxConnected: false,
        error: 'No Dropbox token configured',
        details: 'DROPBOX_ACCESS_TOKEN environment variable is missing'
      });
    }
    
    // Test the actual configured token with Dropbox API
    console.log('🌐 Testing actual Dropbox API connectivity...');
    const testResponse = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(null),
      signal: AbortSignal.timeout(10000)
    });
    
    if (!testResponse.ok) {
      let errorText = 'Unknown error';
      try {
        errorText = await testResponse.text();
      } catch (textError) {
        console.error('❌ Failed to read error response:', textError);
      }
      console.error('❌ Self-test failed:', testResponse.status, errorText);
      return c.json({
        success: false,
        dropboxConnected: false,
        error: `Dropbox API test failed: ${testResponse.status} ${testResponse.statusText}`,
        details: errorText,
        httpStatus: testResponse.status
      });
    }
    
    const accountInfo = await testResponse.json();
    console.log('✅ Self-test successful:', accountInfo.name?.display_name || 'Unknown user');
    
    return c.json({
      success: true,
      dropboxConnected: true,
      message: 'Dropbox connectivity verified successfully',
      accountInfo: {
        name: accountInfo.name?.display_name,
        email: accountInfo.email
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Self-test error:', error);
    return c.json({
      success: false,
      dropboxConnected: false,
      error: 'Self-test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create Dropbox folder
app.post('/make-server-3005c377/dropbox/create-folder', async (c) => {
  try {
    console.log('📂 Creating Dropbox folder...');
    const body = await c.req.json();
    const { folderName } = body;
    
    if (!folderName || !folderName.trim()) {
      return c.json({
        error: 'Folder name is required'
      }, 400);
    }
    
    // Get the current token (try updated one first, then env var)
    let dropboxToken = Deno.env.get('DROPBOX_ACCESS_TOKEN');
    try {
      const tokenUpdate = await kv.get('dropbox_token_update');
      if (tokenUpdate && tokenUpdate.token) {
        dropboxToken = tokenUpdate.token;
        console.log('🔑 Using updated token from storage');
      }
    } catch (kvError) {
      console.log('🔑 Using environment token (no updates found)');
    }
    
    if (!dropboxToken) {
      return c.json({
        error: 'Dropbox token not configured',
        details: 'DROPBOX_ACCESS_TOKEN environment variable is missing'
      }, 500);
    }
    
    const folderPath = `/${folderName.trim()}`;
    console.log(`📂 Creating folder: ${folderPath}`);
    
    const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: folderPath,
        autorename: false
      }),
      signal: AbortSignal.timeout(15000)
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (jsonParseError) {
        let errorText = 'Unknown error';
        try {
          errorText = await response.text();
        } catch (textError) {
          console.error('💥 Failed to read error response:', textError);
        }
        errorData = { error: errorText };
      }
      
      console.error('❌ Folder creation failed:', errorData);
      
      // Handle specific Dropbox errors
      if (errorData.error && errorData.error['.tag'] === 'path' && 
          errorData.error.path && errorData.error.path['.tag'] === 'conflict') {
        console.log('📂 Folder already exists, continuing with upload...');
        return c.json({
          success: true,
          message: 'Folder already exists',
          path: folderPath,
          alreadyExists: true
        });
      }
      
      return c.json({
        error: 'Failed to create folder',
        details: errorData.error || errorData
      }, response.status);
    }
    
    const result = await response.json();
    console.log('✅ Folder created successfully:', result.metadata.path_display);
    
    return c.json({
      success: true,
      message: 'Folder created successfully',
      path: result.metadata.path_display,
      alreadyExists: false
    });
    
  } catch (error) {
    console.error('💥 Error creating Dropbox folder:', error);
    return c.json({
      error: 'Failed to create folder',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Validate Dropbox token by checking account info (following Python pattern)
async function validateDropboxToken(token: string): Promise<{ valid: boolean; error?: string; accountInfo?: any }> {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { 
        valid: false, 
        error: `Token validation failed: HTTP ${response.status} - ${errorText}` 
      };
    }

    const accountInfo = await response.json();
    return { 
      valid: true, 
      accountInfo: {
        name: accountInfo.name?.display_name,
        email: accountInfo.email,
        account_id: accountInfo.account_id
      }
    };
  } catch (error) {
    return { 
      valid: false, 
      error: `Token validation error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

// Grid coordinates storage endpoints
app.post('/make-server-3005c377/grid/update-coordinates', async (c) => {
  try {
    console.log('📍 Updating demo grid coordinates...');
    const body = await c.req.json();
    const { demoId, gridRow, gridCol, clientName, clientEmail, teamName, timeSlot } = body;
    
    if (!demoId) {
      return c.json({
        success: false,
        error: 'Demo ID is required'
      }, 400);
    }
    
    // Store grid coordinates for the demo
    const gridKey = `grid_coords_${demoId}`;
    await kv.set(gridKey, {
      demoId,
      gridRow: gridRow ?? null,
      gridCol: gridCol ?? null,
      teamName: teamName || null,
      timeSlot: timeSlot || null,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`✅ Grid coordinates updated for demo ${demoId}: (${gridRow}, ${gridCol}) → Display: (${gridRow !== null ? gridRow + 1 : null}, ${gridCol !== null ? gridCol + 1 : null})`);
    
    // If demo is being placed on grid (not removed), update Google Sheets with schedule info
    if (gridRow !== null && gridCol !== null && clientName && clientEmail && teamName && timeSlot) {
      try {
        console.log('📝 Updating Google Sheets with schedule information...');
        
        // Map grid coordinates to team and time slot information with detailed mapping
        const scheduleNotes = `Scheduled: ${teamName} at ${timeSlot} (Grid: ${gridRow + 1},${gridCol + 1})`;
        
        // Update Google Sheets with the schedule information in notes
        try {
          const updateResult = await googleSheetsUpdater.updateDemoRequest({
            clientName,
            clientEmail,
            notes: scheduleNotes
          });
          
          if (updateResult.success) {
            console.log('✅ Google Sheets auto-updated with schedule information:', {
              clientName,
              teamName,
              timeSlot,
              gridDisplay: `(${gridRow + 1},${gridCol + 1})`,
              gridInternal: `(${gridRow},${gridCol})`
            });
          } else {
            console.warn('⚠️ Google Sheets update failed (non-critical):', updateResult.error);
            // Don't fail the whole request if Google Sheets update fails
          }
        } catch (updateError) {
          console.warn('⚠️ Google Sheets update error (non-critical):', updateError);
          
          // Check if it's a service account issue
          if (updateError instanceof Error && updateError.message.includes('JWT')) {
            console.warn('🔐 JWT authentication issue detected - service account may need regeneration');
          } else if (updateError instanceof Error && updateError.message.includes('access denied')) {
            console.warn('📊 Access denied - spreadsheet may not be shared properly');
          }
          
          // Don't fail the whole grid operation for Google Sheets update failures
        }
      } catch (sheetsError) {
        console.warn('⚠️ Error updating Google Sheets with schedule info:', sheetsError);
        // Don't fail the whole request if Google Sheets update fails
      }
    } else if (gridRow === null && gridCol === null && clientName && clientEmail) {
      // Demo is being removed from grid, clear schedule info from sheets
      try {
        console.log('📝 Clearing schedule information from Google Sheets...');
        
        const updateResult = await googleSheetsUpdater.updateDemoRequest({
          clientName,
          clientEmail,
          notes: '' // Clear the scheduling notes
        });
        
        if (updateResult.success) {
          console.log('✅ Google Sheets schedule information cleared');
        } else {
          console.warn('⚠️ Failed to clear Google Sheets schedule info:', updateResult.error);
        }
      } catch (sheetsError) {
        console.warn('⚠️ Error clearing Google Sheets schedule info:', sheetsError);
      }
    }
    
    return c.json({
      success: true,
      message: 'Grid coordinates and schedule updated successfully',
      data: { 
        demoId, 
        gridRow, 
        gridCol, 
        displayCoords: gridRow !== null && gridCol !== null ? `(${gridRow + 1},${gridCol + 1})` : null,
        teamName, 
        timeSlot,
        googleSheetsUpdated: gridRow !== null && gridCol !== null ? true : 'cleared'
      }
    });
    
  } catch (error) {
    console.error('💥 Error updating grid coordinates:', error);
    return c.json({
      success: false,
      error: 'Failed to update grid coordinates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

app.get('/make-server-3005c377/grid/get-coordinates/:demoId', async (c) => {
  try {
    const demoId = c.req.param('demoId');
    console.log(`📍 Fetching grid coordinates for demo: ${demoId}`);
    
    const gridKey = `grid_coords_${demoId}`;
    const coordinates = await kv.get(gridKey);
    
    if (!coordinates) {
      return c.json({
        success: true,
        data: null
      });
    }
    
    return c.json({
      success: true,
      data: coordinates
    });
    
  } catch (error) {
    console.error('💥 Error fetching grid coordinates:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch grid coordinates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

app.get('/make-server-3005c377/grid/get-all-coordinates', async (c) => {
  try {
    console.log('📍 Fetching all grid coordinates...');
    
    // Get all grid coordinate entries
    const allCoordinates = await kv.getByPrefix('grid_coords_');
    
    return c.json({
      success: true,
      data: allCoordinates,
      count: allCoordinates.length
    });
    
  } catch (error) {
    console.error('💥 Error fetching all grid coordinates:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch grid coordinates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Create shared link for uploaded file (following Python pattern)
async function createDropboxSharedLink(token: string, filePath: string): Promise<{ success: boolean; url?: string; directUrl?: string; error?: string }> {
  try {
    console.log(`🔗 Creating shared link for: ${filePath}`);
    
    const response = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: filePath,
        settings: {
          requested_visibility: 'public'
        }
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Shared link creation failed: ${response.status} - ${errorText}`);
      return { success: false, error: `Failed to create shared link: ${errorText}` };
    }

    const linkData = await response.json();
    const sharedUrl = linkData.url;
    
    // Convert to direct download URL (following Python pattern)
    const directUrl = sharedUrl
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace('?dl=0', '');
    
    console.log(`✅ Shared link created: ${sharedUrl}`);
    console.log(`✅ Direct URL: ${directUrl}`);
    
    return { 
      success: true, 
      url: sharedUrl, 
      directUrl: directUrl 
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`💥 Shared link creation error: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

// Debug endpoint to check FormData parsing
app.post('/make-server-3005c377/dropbox/debug-formdata', async (c) => {
  try {
    console.log('🐛 Debug FormData endpoint called');
    
    const formData = await c.req.formData();
    const debug = {
      keys: Array.from(formData.keys()),
      entries: [],
      fileCount: 0,
      textEntries: {}
    };

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        debug.entries.push({
          key,
          type: 'File',
          name: value.name,
          size: value.size,
          mimeType: value.type
        });
        debug.fileCount++;
      } else {
        debug.textEntries[key] = String(value);
        debug.entries.push({
          key,
          type: 'String',
          value: String(value),
          length: String(value).length
        });
      }
    }

    console.log('🐛 FormData debug result:', debug);
    
    return c.json({
      success: true,
      debug,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🐛 FormData debug error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Debug failed',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Emergency simple upload endpoint (bypasses folder creation for testing)
app.post('/make-server-3005c377/dropbox/upload-simple', async (c) => {
  console.log('🚨 Emergency simple upload endpoint called');
  
  try {
    // Get token
    let dropboxToken = Deno.env.get('DROPBOX_ACCESS_TOKEN');
    try {
      const tokenUpdate = await kv.get('dropbox_token_update');
      if (tokenUpdate && tokenUpdate.token) {
        dropboxToken = tokenUpdate.token;
      }
    } catch (kvError) {
      console.log('🔑 Using environment token');
    }
    
    if (!dropboxToken) {
      return c.json({
        success: false,
        error: 'No Dropbox token available'
      }, 500);
    }

    // Parse FormData
    const formData = await c.req.formData();
    const folderName = (formData.get('folderPath') as string) || 
                       (formData.get('folder') as string) || 
                       'emergency-uploads';
    
    console.log(`🚨 Simple upload to folder: ${folderName}`);
    
    // Get files
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return c.json({
        success: false,
        error: 'No files found'
      }, 400);
    }

    // Upload each file directly (no folder creation, no shared links)
    const results = [];
    let successCount = 0;

    for (const file of files) {
      try {
        const fileBuffer = await file.arrayBuffer();
        const cleanFolder = folderName.replace(/^\/+|\/+$/g, '') || 'emergency-uploads';
        const filePath = `/${cleanFolder}/${file.name}`;

        console.log(`🚨 Direct upload: ${file.name} -> ${filePath}`);

        const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${dropboxToken}`,
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({
              path: filePath,
              mode: 'overwrite',
              autorename: true
            })
          },
          body: fileBuffer
        });

        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          results.push({
            fileName: file.name,
            success: true,
            path: result.path_display
          });
          successCount++;
          console.log(`✅ ${file.name} uploaded successfully`);
        } else {
          const errorText = await uploadResponse.text();
          results.push({
            fileName: file.name,
            success: false,
            error: `HTTP ${uploadResponse.status}: ${errorText}`
          });
          console.error(`❌ ${file.name} failed: ${errorText}`);
        }
      } catch (fileError) {
        results.push({
          fileName: file.name,
          success: false,
          error: fileError instanceof Error ? fileError.message : 'File processing error'
        });
        console.error(`💥 ${file.name} error:`, fileError);
      }
    }

    return c.json({
      success: successCount > 0,
      totalFiles: files.length,
      successfulUploads: successCount,
      failedUploads: files.length - successCount,
      results,
      emergency: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🚨 Emergency upload error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Emergency upload failed',
      emergency: true
    }, 500);
  }
});

// Enhanced batch upload with Python patterns (NEW IMPLEMENTATION)
app.post('/make-server-3005c377/dropbox/upload-batch-enhanced', async (c) => {
  console.log('📤 Enhanced batch upload endpoint called (following Python patterns)');
  const startTime = Date.now();
  
  try {
    // Get the current token (try updated one first, then env var)
    let dropboxToken = Deno.env.get('DROPBOX_ACCESS_TOKEN');
    try {
      const tokenUpdate = await kv.get('dropbox_token_update');
      if (tokenUpdate && tokenUpdate.token) {
        dropboxToken = tokenUpdate.token;
        console.log('🔑 Using updated token from storage');
      }
    } catch (kvError) {
      console.log('🔑 Using environment token (KV fetch failed)');
    }
    
    if (!dropboxToken) {
      console.error('❌ No Dropbox token available');
      return c.json({
        success: false,
        error: 'Dropbox token not configured',
        details: 'DROPBOX_ACCESS_TOKEN environment variable is missing',
        totalFiles: 0,
        successfulUploads: 0,
        failedUploads: 0,
        results: []
      }, 500);
    }

    // Step 1: Validate token before processing files (following Python pattern)
    console.log('🔐 Validating Dropbox token before upload...');
    const tokenValidation = await validateDropboxToken(dropboxToken);
    if (!tokenValidation.valid) {
      console.error('❌ Token validation failed:', tokenValidation.error);
      return c.json({
        success: false,
        error: 'Invalid or expired Dropbox token',
        details: tokenValidation.error,
        totalFiles: 0,
        successfulUploads: 0,
        failedUploads: 0,
        results: []
      }, 401);
    }
    
    console.log(`✅ Token validated for account: ${tokenValidation.accountInfo?.name} (${tokenValidation.accountInfo?.email})`);

    // Step 2: Parse the FormData
    console.log('📋 Parsing FormData...');
    const formData = await c.req.formData();
    console.log(`📋 FormData parsed. Keys: ${Array.from(formData.keys()).join(', ')}`);
    
    // Get folder name (support both folderPath and folder keys) with better extraction
    const folderPathRaw = formData.get('folderPath') as string;
    const folderRaw = formData.get('folder') as string;
    
    console.log(`📁 Raw folderPath: "${folderPathRaw}"`);
    console.log(`📁 Raw folder: "${folderRaw}"`);
    
    // Extract folder name from path if it starts with '/' 
    let folderName = folderPathRaw || folderRaw || 'uploads';
    if (folderName && folderName.startsWith('/')) {
      // Remove leading slash and extract folder name
      folderName = folderName.substring(1);
    }
    
    // If still empty or just '/', use default
    if (!folderName || folderName === '' || folderName === '/') {
      folderName = 'uploads';
    }
    
    console.log(`📁 Processed folder name: "${folderName}"`);
    
    // Get all files
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value instanceof File) {
        files.push(value);
        console.log(`📄 Found file: ${value.name} (${value.size} bytes, type: ${value.type})`);
      }
    }

    if (files.length === 0) {
      console.error('❌ No files found in FormData');
      return c.json({
        success: false,
        error: 'No files provided',
        details: 'No files were found in the request',
        totalFiles: 0,
        successfulUploads: 0,
        failedUploads: 0,
        results: []
      }, 400);
    }

    console.log(`📤 Processing ${files.length} files for enhanced upload...`);

    // Step 3: Process each file with enhanced error handling
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      try {
        console.log(`📤 Processing file: ${file.name} (${file.size} bytes)`);
        
        // Enhanced file validation
        if (file.size === 0) {
          console.warn(`⚠️ Skipping empty file: ${file.name}`);
          results.push({
            fileName: file.name,
            success: false,
            error: 'File is empty (0 bytes)'
          });
          failCount++;
          continue;
        }

        if (file.size > 150 * 1024 * 1024) { // 150MB limit
          console.warn(`⚠️ File too large: ${file.name} (${file.size} bytes)`);
          results.push({
            fileName: file.name,
            success: false,
            error: `File too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum size is 150 MB.`
          });
          failCount++;
          continue;
        }

        // Read file content
        const fileBuffer = await file.arrayBuffer();
        
        // Ensure clean file path construction
        const cleanFolderName = folderName.replace(/^\/+|\/+$/g, '') || 'uploads'; // Remove leading/trailing slashes
        const cleanFileName = file.name.replace(/^\/+/, ''); // Remove leading slashes from filename
        const filePath = `/${cleanFolderName}/${cleanFileName}`;
        
        console.log(`📤 Uploading ${file.name} to ${filePath}...`);
        console.log(`📤 Clean folder: "${cleanFolderName}", Clean file: "${cleanFileName}"`);

        // Enhanced upload with overwrite mode (following Python pattern)
        console.log(`🌐 Making enhanced Dropbox API call for file: ${file.name}`);
        const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${dropboxToken}`,
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({
              path: filePath,
              mode: 'overwrite', // Use overwrite mode like Python implementation
              autorename: true
            })
          },
          body: fileBuffer,
          signal: AbortSignal.timeout(60000)
        });

        console.log(`📡 Upload response for ${file.name}: ${uploadResponse.status} ${uploadResponse.statusText}`);

        if (!uploadResponse.ok) {
          let detailedError = `HTTP ${uploadResponse.status} ${uploadResponse.statusText}`;
          console.error(`❌ Upload failed for ${file.name}: ${uploadResponse.status} ${uploadResponse.statusText}`);
          
          try {
            const errorBody = await uploadResponse.json();
            console.error(`❌ Error response body:`, errorBody);
            detailedError = errorBody.error_summary || errorBody.error || detailedError;
          } catch (e) {
            console.error(`❌ Could not parse error response for ${file.name}`);
            try {
              const errorText = await uploadResponse.text();
              if (errorText) {
                detailedError += ` - ${errorText}`;
              }
            } catch (textError) {
              console.error(`❌ Could not read error text for ${file.name}`);
            }
          }

          results.push({
            fileName: file.name,
            success: false,
            error: detailedError
          });
          failCount++;
          continue;
        }

        const uploadResult = await uploadResponse.json();
        console.log(`✅ Successfully uploaded ${file.name}:`, uploadResult.path_display);

        // Step 4: Create shared link for uploaded file (following Python pattern)
        const sharedLinkResult = await createDropboxSharedLink(dropboxToken, uploadResult.path_display);
        
        const fileResult = {
          fileName: file.name,
          success: true,
          path: uploadResult.path_display,
          size: file.size,
          id: uploadResult.id,
          clientModified: uploadResult.client_modified,
          serverModified: uploadResult.server_modified
        };

        // Add shared link info if successful
        if (sharedLinkResult.success) {
          fileResult.sharedUrl = sharedLinkResult.url;
          fileResult.directUrl = sharedLinkResult.directUrl;
        } else {
          console.warn(`⚠️ Shared link creation failed for ${file.name}: ${sharedLinkResult.error}`);
          fileResult.linkError = sharedLinkResult.error;
        }

        results.push(fileResult);
        successCount++;

      } catch (error) {
        console.error(`💥 Error processing file ${file.name}:`, error);
        results.push({
          fileName: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error during upload'
        });
        failCount++;
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`📊 Enhanced Upload Summary:`);
    console.log(`  - Account: ${tokenValidation.accountInfo?.name}`);
    console.log(`  - Total files: ${files.length}`);
    console.log(`  - Successful: ${successCount}`);
    console.log(`  - Failed: ${failCount}`);
    console.log(`  - Duration: ${duration}ms`);
    console.log(`  - Success rate: ${((successCount / files.length) * 100).toFixed(1)}%`);

    const responseData = {
      success: successCount > 0,
      totalFiles: files.length,
      successfulUploads: successCount,
      failedUploads: failCount,
      results,
      folderPath: `/${folderName}`,
      account: tokenValidation.accountInfo,
      duration: `${duration}ms`,
      successRate: `${((successCount / files.length) * 100).toFixed(1)}%`,
      timestamp: new Date().toISOString(),
      debug: {
        tokenValidated: true,
        accountConnected: tokenValidation.accountInfo?.name,
        processingMode: 'enhanced_with_overwrite_and_links',
        pythonPatternImplemented: true
      }
    };

    // Add error summary if there were failures
    if (failCount > 0) {
      const errors = results.filter(r => !r.success).map(r => r.error).slice(0, 3);
      responseData.errorSummary = `${failCount} uploads failed. Common errors: ${errors.join(', ')}`;
    }

    // Add shared link summary
    const withLinks = results.filter(r => r.success && r.sharedUrl).length;
    const linkErrors = results.filter(r => r.success && r.linkError).length;
    responseData.linkSummary = `${withLinks} shared links created, ${linkErrors} link creation failed`;

    return c.json(responseData);

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error('💥 Enhanced batch upload error:', error);
    return c.json({
      success: false,
      error: 'Enhanced batch upload failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      totalFiles: 0,
      successfulUploads: 0,
      failedUploads: 0,
      results: [],
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      debug: {
        tokenValidated: false,
        error: 'Failed before token validation',
        pythonPatternImplemented: true
      }
    }, 500);
  }
});

// Enhanced test upload with full workflow (following Python pattern)
app.post('/make-server-3005c377/dropbox/test-upload', async (c) => {
  try {
    console.log('🧪 Testing enhanced Dropbox upload workflow...');
    
    // Get the current token (try updated one first, then env var)
    let dropboxToken = Deno.env.get('DROPBOX_ACCESS_TOKEN');
    try {
      const tokenUpdate = await kv.get('dropbox_token_update');
      if (tokenUpdate && tokenUpdate.token) {
        dropboxToken = tokenUpdate.token;
        console.log('🔑 Using updated token from storage for test upload');
      }
    } catch (kvError) {
      console.log('🔑 Using environment token for test upload');
    }
    
    if (!dropboxToken) {
      return c.json({
        error: 'Dropbox token not configured',
        details: 'DROPBOX_ACCESS_TOKEN environment variable is missing'
      }, 500);
    }

    // Step 1: Validate token (following Python pattern)
    console.log('🔐 Validating Dropbox token...');
    const tokenValidation = await validateDropboxToken(dropboxToken);
    if (!tokenValidation.valid) {
      return c.json({
        success: false,
        error: 'Token validation failed',
        details: tokenValidation.error
      }, 401);
    }
    
    console.log(`✅ Token valid for account: ${tokenValidation.accountInfo?.name} (${tokenValidation.accountInfo?.email})`);
    
    // Step 2: Create test file
    const testContent = `Test file created at ${new Date().toISOString()}\nAccount: ${tokenValidation.accountInfo?.name}\nThis is a comprehensive test to verify Dropbox upload functionality.`;
    const testBuffer = new TextEncoder().encode(testContent);
    const fileName = `test-upload-${Date.now()}.txt`;
    const testFilePath = `/on2cook-uploads/${fileName}`;
    
    console.log(`🧪 Creating test file: ${testFilePath} (${testBuffer.byteLength} bytes)`);
    
    // Step 3: Upload file with overwrite mode (following Python pattern)
    const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dropboxToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: testFilePath,
          mode: 'overwrite', // Use overwrite mode like Python
          autorename: true
        })
      },
      body: testBuffer,
      signal: AbortSignal.timeout(30000)
    });
    
    console.log(`📡 Upload response: ${uploadResponse.status} ${uploadResponse.statusText}`);
    
    if (!uploadResponse.ok) {
      let errorData;
      try {
        errorData = await uploadResponse.json();
      } catch (jsonError) {
        try {
          errorData = { error: await uploadResponse.text() };
        } catch (textError) {
          errorData = { error: 'Could not read error response' };
        }
      }
      
      console.error('❌ Upload failed:', errorData);
      return c.json({
        success: false,
        error: 'Upload failed',
        details: errorData,
        httpStatus: uploadResponse.status
      });
    }
    
    const uploadResult = await uploadResponse.json();
    console.log('✅ Upload successful:', uploadResult.path_display);
    
    // Step 4: Create shared link (following Python pattern)
    const sharedLinkResult = await createDropboxSharedLink(dropboxToken, uploadResult.path_display);
    
    return c.json({
      success: true,
      message: 'Enhanced test upload successful',
      account: tokenValidation.accountInfo,
      file: {
        name: fileName,
        path: uploadResult.path_display,
        size: testBuffer.byteLength,
        id: uploadResult.id,
        clientModified: uploadResult.client_modified,
        serverModified: uploadResult.server_modified
      },
      links: sharedLinkResult.success ? {
        shared: sharedLinkResult.url,
        direct: sharedLinkResult.directUrl
      } : null,
      linkError: sharedLinkResult.success ? null : sharedLinkResult.error,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Enhanced test upload error:', error);
    return c.json({
      success: false,
      error: 'Enhanced test upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Upload files to Dropbox
app.post('/make-server-3005c377/dropbox/upload-batch', async (c) => {
  try {
    console.log('📤 Starting batch upload to Dropbox...');
    
    // Get the current token (try updated one first, then env var)
    let dropboxToken = Deno.env.get('DROPBOX_ACCESS_TOKEN');
    try {
      const tokenUpdate = await kv.get('dropbox_token_update');
      if (tokenUpdate && tokenUpdate.token) {
        dropboxToken = tokenUpdate.token;
        console.log('🔑 Using updated token from storage');
      }
    } catch (kvError) {
      console.log('🔑 Using environment token (no updates found)');
    }
    
    if (!dropboxToken) {
      return c.json({
        error: 'Dropbox token not configured',
        details: 'DROPBOX_ACCESS_TOKEN environment variable is missing'
      }, 500);
    }
    
    // Parse form data with enhanced error handling
    let formData: FormData;
    try {
      formData = await c.req.formData();
      console.log('📋 FormData parsed successfully');
    } catch (formDataError) {
      console.error('💥 Failed to parse FormData:', formDataError);
      return c.json({
        error: 'Failed to parse request data',
        details: formDataError instanceof Error ? formDataError.message : 'Unknown FormData parsing error'
      }, 400);
    }

    // Enhanced logging of all FormData entries
    console.log('📊 FormData entries:');
    let entryCount = 0;
    for (const [key, value] of formData.entries()) {
      entryCount++;
      if (value instanceof File) {
        console.log(`  Entry ${entryCount}: ${key} = File("${value.name}", ${value.size} bytes, type: "${value.type}")`);
      } else {
        console.log(`  Entry ${entryCount}: ${key} = "${value}"`);
      }
    }
    console.log(`📊 Total FormData entries: ${entryCount}`);

    const folderPath = formData.get('folderPath') as string;
    console.log(`📂 Folder path from FormData: "${folderPath}"`);
    
    if (!folderPath) {
      console.error('❌ Missing folderPath in FormData');
      return c.json({
        error: 'Folder path is required',
        debug: {
          formDataEntries: entryCount,
          receivedKeys: Array.from(formData.keys())
        }
      }, 400);
    }
    
    // Get all files from form data with enhanced validation
    const files: File[] = [];
    const fileKeys: string[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file')) {
        fileKeys.push(key);
        if (value instanceof File) {
          console.log(`📎 Found file: ${key} -> "${value.name}" (${value.size} bytes)`);
          if (value.size === 0) {
            console.warn(`⚠️ File ${value.name} has 0 bytes - this may cause upload issues`);
          }
          files.push(value);
        } else {
          console.warn(`⚠️ Key ${key} is not a File object:`, typeof value, value);
        }
      }
    }
    
    console.log(`📊 File processing summary: Found ${fileKeys.length} file keys, ${files.length} valid files`);
    
    if (files.length === 0) {
      console.error('❌ No valid files found in FormData');
      return c.json({
        error: 'No files provided for upload',
        debug: {
          totalEntries: entryCount,
          fileKeys: fileKeys,
          allKeys: Array.from(formData.keys()),
          fileKeyCount: fileKeys.length,
          validFileCount: files.length
        }
      }, 400);
    }
    
    console.log(`📤 Uploading ${files.length} files to ${folderPath}`);
    
    const uploadResults = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📎 Uploading file ${i + 1}/${files.length}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      try {
        const fileBuffer = await file.arrayBuffer();
        const filePath = `${folderPath}/${file.name}`;
        
        // Enhanced logging before making Dropbox API call
        console.log(`🌐 Making Dropbox API call for file: ${file.name}`);
        console.log(`📡 Request details:`);
        console.log(`  - URL: https://content.dropboxapi.com/2/files/upload`);
        console.log(`  - File path: ${filePath}`);
        console.log(`  - File size: ${fileBuffer.byteLength} bytes`);
        console.log(`  - Token length: ${dropboxToken.length} chars`);
        console.log(`  - Dropbox-API-Arg: ${JSON.stringify({
          path: filePath,
          mode: 'add',
          autorename: true
        })}`);

        const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${dropboxToken}`,
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({
              path: filePath,
              mode: 'add',
              autorename: true
            })
          },
          body: fileBuffer,
          signal: AbortSignal.timeout(60000) // 60 second timeout for uploads
        });

        console.log(`📡 Dropbox API response for ${file.name}: ${uploadResponse.status} ${uploadResponse.statusText}`);
        console.log(`📊 Response headers: ${JSON.stringify(Object.fromEntries(uploadResponse.headers.entries()), null, 2)}`);
        
        if (!uploadResponse.ok) {
          let detailedError = `HTTP ${uploadResponse.status} ${uploadResponse.statusText}`;
          console.error(`❌ Dropbox API call failed for ${file.name}: ${uploadResponse.status} ${uploadResponse.statusText}`);
          
          try {
            // Clone the response to avoid consuming the body multiple times
            const responseClone = uploadResponse.clone();
            const errorData = await responseClone.json();
            
            // Parse Dropbox-specific errors
            if (errorData.error) {
              if (errorData.error['.tag'] === 'path' && errorData.error.path) {
                const pathError = errorData.error.path['.tag'];
                if (pathError === 'insufficient_space') {
                  detailedError = 'Insufficient space in Dropbox account';
                } else if (pathError === 'disallowed_name') {
                  detailedError = 'File name not allowed by Dropbox';
                } else if (pathError === 'conflict') {
                  detailedError = 'File already exists with this name';
                } else {
                  detailedError = `Path error: ${pathError}`;
                }
              } else if (errorData.error['.tag'] === 'too_large') {
                detailedError = 'File too large for upload';
              } else if (typeof errorData.error === 'string') {
                detailedError = errorData.error;
              } else {
                detailedError = `Dropbox API error: ${JSON.stringify(errorData.error)}`;
              }
            }
          } catch (jsonParseError) {
            console.log('💥 Failed to parse JSON error response, trying text...');
            try {
              const errorText = await uploadResponse.text();
              if (errorText && errorText.trim().length > 0) {
                detailedError = errorText.substring(0, 200); // Limit error text length
              }
            } catch (textError) {
              console.error('💥 Failed to read any error response:', textError);
              detailedError = `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} (Unable to read error details)`;
            }
          }
          
          console.error(`❌ Upload failed for ${file.name}: ${detailedError}`);
          uploadResults.push({
            fileName: file.name,
            success: false,
            error: detailedError
          });
        } else {
          const result = await uploadResponse.json();
          console.log(`✅ Upload successful for ${file.name}: ${result.path_display}`);
          uploadResults.push({
            fileName: file.name,
            success: true,
            path: result.path_display,
            size: file.size
          });
        }
      } catch (fileError) {
        console.error(`💥 Error uploading ${file.name}:`, fileError);
        uploadResults.push({
          fileName: file.name,
          success: false,
          error: fileError instanceof Error ? fileError.message : 'Unknown error'
        });
      }
    }
    
    const successfulUploads = uploadResults.filter(r => r.success);
    const failedUploads = uploadResults.filter(r => !r.success);
    
    console.log(`📊 Upload complete: ${successfulUploads.length}/${files.length} successful`);
    
    // Enhanced debugging information
    if (successfulUploads.length > 0) {
      console.log('✅ Successful uploads:', successfulUploads.map(r => r.fileName).join(', '));
    }
    if (failedUploads.length > 0) {
      console.log('❌ Failed uploads:', failedUploads.map(r => `${r.fileName}: ${r.error}`).join(', '));
    }
    
    // Add detailed error summary if all uploads failed
    let errorSummary = null;
    if (failedUploads.length === files.length) {
      const errorTypes = failedUploads.map(f => f.error);
      const tokenErrors = errorTypes.filter(e => e.includes('401') || e.includes('invalid_access_token') || e.includes('token'));
      const spaceErrors = errorTypes.filter(e => e.includes('insufficient_space'));
      
      if (tokenErrors.length > 0) {
        errorSummary = 'All uploads failed due to invalid or expired Dropbox token. Please update your token.';
      } else if (spaceErrors.length > 0) {
        errorSummary = 'All uploads failed due to insufficient space in Dropbox account.';
      } else {
        const firstError = errorTypes[0] || 'Unknown error';
        errorSummary = `All uploads failed. Primary error: ${firstError}`;
      }
    }

    // Enhanced response with debugging information
    const response = {
      success: failedUploads.length === 0,
      totalFiles: files.length,
      successfulUploads: successfulUploads.length,
      failedUploads: failedUploads.length,
      results: uploadResults,
      folderPath,
      errorSummary,
      message: successfulUploads.length > 0 
        ? `Upload completed: ${successfulUploads.length}/${files.length} files successful`
        : `Upload failed: All ${files.length} files failed to upload`,
      debug: {
        formDataEntries: entryCount,
        serverTimestamp: new Date().toISOString(),
        hasDropboxToken: Boolean(dropboxToken),
        dropboxTokenLength: dropboxToken ? dropboxToken.length : 0,
        processing: {
          filesReceived: files.length,
          largestFile: files.reduce((max, f) => f.size > max ? f.size : max, 0),
          totalDataSize: files.reduce((sum, f) => sum + f.size, 0)
        }
      }
    };

    console.log('📤 Final response:', JSON.stringify(response, null, 2));
    return c.json(response);
    
  } catch (error) {
    console.error('💥 Error in batch upload:', error);
    return c.json({
      error: 'Batch upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Spreadsheet validation endpoint
app.get('/make-server-3005c377/validate-spreadsheet', async (c) => {
  console.log('📊 Spreadsheet validation requested');
  
  try {
    const spreadsheetId = c.req.query('spreadsheetId') || '1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM';
    
    console.log(`🔍 Validating spreadsheet: ${spreadsheetId}`);
    
    // Test multiple CSV export formats
    const testUrls = [
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=964863455`,
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?exportFormat=csv&gid=964863455`,
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=964863455`
    ];
    
    const results = [];
    
    for (let i = 0; i < testUrls.length; i++) {
      const testUrl = testUrls[i];
      console.log(`🧪 Testing URL format ${i + 1}: ${testUrl}`);
      
      try {
        const response = await fetch(testUrl, {
          method: 'HEAD', // Just check headers
          signal: AbortSignal.timeout(10000)
        });
        
        results.push({
          format: i + 1,
          url: testUrl,
          status: response.status,
          statusText: response.statusText,
          accessible: response.ok,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length')
        });
        
        console.log(`📊 Format ${i + 1} result: ${response.status} ${response.statusText}`);
      } catch (error) {
        results.push({
          format: i + 1,
          url: testUrl,
          accessible: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log(`❌ Format ${i + 1} failed:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    const accessibleFormats = results.filter(r => r.accessible);
    const hasAccessibleFormat = accessibleFormats.length > 0;
    
    return c.json({
      success: true,
      spreadsheetId,
      accessible: hasAccessibleFormat,
      accessibleFormats: accessibleFormats.length,
      totalFormats: results.length,
      results,
      recommendation: hasAccessibleFormat 
        ? 'Spreadsheet is accessible! Use the working URL format.' 
        : 'Spreadsheet is not accessible. Please check sharing permissions and ensure it\'s set to "Anyone with the link can view".',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error validating spreadsheet:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// CSV data endpoint
app.get('/make-server-3005c377/csv/data', async (c) => {
  console.log('📊 CSV data endpoint called');
  
  try {
    const demoRequestsCsvUrl = c.req.query('demoRequestsCsvUrl');
    const tasksCsvUrl = c.req.query('tasksCsvUrl');

    if (!demoRequestsCsvUrl) {
      console.error('❌ Missing demoRequestsCsvUrl parameter');
      return c.json({ error: 'demoRequestsCsvUrl parameter is required' }, 400);
    }

    console.log('📊 Processing CSV data request...');
    console.log('🔗 Demo requests URL:', demoRequestsCsvUrl);
    console.log('🔗 Tasks URL:', tasksCsvUrl || 'Not provided');
    
    // Validate URL format
    if (!demoRequestsCsvUrl.includes('docs.google.com/spreadsheets')) {
      console.error('❌ Invalid Google Sheets URL format');
      return c.json({ 
        error: 'Invalid CSV URL format',
        details: 'URL must be a Google Sheets CSV export URL'
      }, 400);
    }

    const csvData = await fetchCsvData(demoRequestsCsvUrl, tasksCsvUrl);
    
    // Merge with backend-stored demo requests (for recipe updates)
    console.log('🔗 Merging with backend-stored demo requests...');
    const backendDemoRequests = await kv.getByPrefix('demo_request:');
    console.log(`🔍 Found ${backendDemoRequests.length} backend demo requests to merge`);
    
    // Create a map of backend requests by client details for merging
    const backendRequestsMap = new Map();
    backendDemoRequests.forEach(req => {
      // Add safety checks for req.value and its properties
      if (req && req.value && req.value.clientName && req.value.clientEmail) {
        const demo = req.value;
        const key = `${demo.clientName.toLowerCase()}:${demo.clientEmail.toLowerCase()}:${demo.clientMobile || ''}`;
        backendRequestsMap.set(key, demo);
        console.log(`🔍 Server-side: Added backend demo to map:`, {
          key,
          clientName: demo.clientName,
          recipesCount: demo.recipes?.length || 0,
          updatedBy: demo.updatedBy
        });
      } else {
        console.warn('⚠️ Skipping invalid backend demo request:', req);
      }
    });
    
    // Merge CSV data with backend data
    const mergedDemoRequests = csvData.demoRequests.map(csvDemo => {
      // Add safety checks for csvDemo properties
      if (!csvDemo || !csvDemo.clientName || !csvDemo.clientEmail) {
        console.warn('⚠️ Skipping invalid CSV demo request:', csvDemo);
        return null;
      }
      
      const key = `${csvDemo.clientName.toLowerCase()}:${csvDemo.clientEmail.toLowerCase()}:${csvDemo.clientMobile || ''}`;
      const backendDemo = backendRequestsMap.get(key);
      
      if (backendDemo) {
        console.log(`🔗 Server-side: Merging backend data for ${csvDemo.clientName}:`, {
          csvRecipes: csvDemo.recipes?.length || 0,
          backendRecipes: backendDemo.recipes?.length || 0,
          finalRecipes: (backendDemo.recipes || csvDemo.recipes)?.length || 0
        });
        return {
          ...csvDemo,
          // Preserve backend-stored recipes and other user updates
          recipes: backendDemo.recipes || csvDemo.recipes,
          notes: backendDemo.notes || csvDemo.notes,
          updatedAt: backendDemo.updatedAt,
          updatedBy: backendDemo.updatedBy
        };
      }
      
      return csvDemo;
    }).filter(Boolean); // Remove null entries
    
    const data = {
      ...csvData,
      demoRequests: mergedDemoRequests
    };

    console.log(`✅ Successfully processed CSV data: ${data.demoRequests.length} demo requests, ${data.tasks.length} tasks`);

    return c.json({
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Error in CSV data endpoint:', error);
    
    // Provide more specific error information
    let statusCode = 500;
    let errorMessage = 'Failed to fetch CSV data';
    let errorDetails = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorDetails.includes('400') || errorDetails.includes('Bad Request')) {
      statusCode = 400;
      errorMessage = 'Invalid request to CSV source';
    } else if (errorDetails.includes('404') || errorDetails.includes('Not Found')) {
      statusCode = 404;
      errorMessage = 'CSV data source not found';
    } else if (errorDetails.includes('timeout') || errorDetails.includes('ETIMEDOUT')) {
      statusCode = 408;
      errorMessage = 'CSV data source timeout';
    }
    
    return c.json({
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString(),
      url: c.req.query('demoRequestsCsvUrl')
    }, statusCode);
  }
});

// Demo requests management endpoints

// Get all demo requests
app.get('/make-server-3005c377/demo-requests', async (c) => {
  try {
    console.log('📋 Fetching all demo requests from backend storage...');
    
    const demoRequests = await kv.getByPrefix('demo_request:');
    const data = demoRequests.map(req => req.value).filter(Boolean);
    
    console.log(`✅ Retrieved ${data.length} demo requests from backend`);
    
    return c.json({
      success: true,
      data,
      count: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error fetching demo requests:', error);
    return c.json({
      error: 'Failed to fetch demo requests',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Save/update demo request
app.put('/make-server-3005c377/demo-requests/:id', async (c) => {
  try {
    const demoId = c.req.param('id');
    const demoData = await c.req.json();
    
    console.log('💾 Saving demo request to backend:', {
      id: demoId,
      clientName: demoData.clientName,
      recipesCount: demoData.recipes?.length || 0,
      updatedBy: demoData.updatedBy
    });
    
    // Add metadata
    const finalData = {
      ...demoData,
      id: demoId,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`demo_request:${demoId}`, finalData);
    
    console.log('✅ Demo request saved successfully');
    
    return c.json({
      success: true,
      data: finalData,
      message: 'Demo request saved successfully'
    });
  } catch (error) {
    console.error('💥 Error saving demo request:', error);
    return c.json({
      error: 'Failed to save demo request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Update demo request in Google Sheets (new approach)
app.put('/make-server-3005c377/demo-requests/:id/sheets', async (c) => {
  try {
    const demoId = c.req.param('id');
    const body = await c.req.json();
    const { clientName, clientEmail, recipes, notes, mediaLink, updatedBy } = body;
    
    console.log(`📝 Updating demo request in Google Sheets:`, {
      demoId,
      clientName,
      clientEmail,
      recipesCount: recipes?.length || 0,
      updatedBy
    });
    
    // Check if service account is configured
    if (!googleSheetsService.isServiceAccountConfigured()) {
      console.error('❌ Service account not configured for Google Sheets updates');
      return c.json({
        error: 'Google Sheets service account not configured',
        details: 'GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON environment variable is missing. Please configure service account authentication.'
      }, 500);
    }
    
    // Get the spreadsheet ID with fallback to default
    const spreadsheetId = Deno.env.get('ON2COOK_SPREADSHEET_ID') || '1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM';
    
    console.log('🔧 Using spreadsheet ID for update:', {
      envSpreadsheetId: Deno.env.get('ON2COOK_SPREADSHEET_ID'),
      finalSpreadsheetId: spreadsheetId,
      clientName: clientName
    });
    
    // Create a new GoogleSheetsUpdater instance with explicit spreadsheet ID
    const { GoogleSheetsUpdater } = await import('./googleSheetsUpdater.tsx');
    const updater = new GoogleSheetsUpdater(spreadsheetId);
    
    console.log('🔄 Attempting to update Google Sheets...');
    
    const updateResult = await updater.updateDemoRequest({
      id: demoId,
      clientName,
      clientEmail,
      recipes: recipes || [],
      notes: notes || '',
      mediaLink: mediaLink || '',
      updatedBy: updatedBy || 'Unknown User'
    });
    
    if (updateResult.success) {
      console.log('✅ Google Sheets update successful:', updateResult.message);
      return c.json({
        success: true,
        message: updateResult.message,
        details: updateResult.details,
        spreadsheetId: spreadsheetId,
        updatedBy: updatedBy,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Google Sheets update failed:', updateResult.error);
      return c.json({
        error: 'Failed to update Google Sheets',
        details: updateResult.error,
        spreadsheetId: spreadsheetId
      }, 400);
    }
    
  } catch (error) {
    console.error('💥 Error updating demo request in Google Sheets:', error);
    return c.json({
      error: 'Failed to update Google Sheets',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Bulk update Google Sheets endpoint
app.post('/make-server-3005c377/google-sheets/bulk-update', async (c) => {
  try {
    console.log('📊 Processing bulk Google Sheets update...');
    
    const body = await c.req.json();
    const { updates, updatedBy } = body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return c.json({
        error: 'Updates array is required and must not be empty'
      }, 400);
    }
    
    // Check if service account is configured
    if (!googleSheetsService.isServiceAccountConfigured()) {
      console.error('❌ Service account not configured for Google Sheets updates');
      return c.json({
        error: 'Google Sheets service account not configured',
        details: 'GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON environment variable is missing.'
      }, 500);
    }
    
    const spreadsheetId = Deno.env.get('ON2COOK_SPREADSHEET_ID') || '1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM';
    
    console.log(`🔄 Processing ${updates.length} bulk updates for spreadsheet: ${spreadsheetId}`);
    
    const { GoogleSheetsUpdater } = await import('./googleSheetsUpdater.tsx');
    const updater = new GoogleSheetsUpdater(spreadsheetId);
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      console.log(`📝 Processing update ${i + 1}/${updates.length}: ${update.clientName}`);
      
      try {
        const result = await updater.updateDemoRequest({
          ...update,
          updatedBy: updatedBy || 'Bulk Update'
        });
        
        if (result.success) {
          successCount++;
          results.push({
            clientName: update.clientName,
            success: true,
            message: result.message
          });
        } else {
          errorCount++;
          results.push({
            clientName: update.clientName,
            success: false,
            error: result.error
          });
        }
      } catch (updateError) {
        errorCount++;
        console.error(`💥 Error processing update for ${update.clientName}:`, updateError);
        results.push({
          clientName: update.clientName,
          success: false,
          error: updateError instanceof Error ? updateError.message : 'Unknown error'
        });
      }
    }
    
    console.log(`📊 Bulk update complete: ${successCount} successful, ${errorCount} failed`);
    
    return c.json({
      success: errorCount === 0,
      totalUpdates: updates.length,
      successCount,
      errorCount,
      results,
      updatedBy: updatedBy,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error in bulk update:', error);
    return c.json({
      error: 'Bulk update failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Recipe Repository Endpoints

// Get all recipes
app.get('/make-server-3005c377/recipes', async (c) => {
  try {
    console.log('🍳 Fetching all recipes from backend storage...');
    
    const recipes = await kv.getByPrefix('recipe:');
    const data = recipes.map(recipe => recipe.value).filter(Boolean);
    
    console.log(`✅ Retrieved ${data.length} recipes from backend`);
    
    return c.json({
      success: true,
      data,
      count: data.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('💥 Error fetching recipes:', error);
    return c.json({
      error: 'Failed to fetch recipes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Add new recipe
app.post('/make-server-3005c377/recipes', async (c) => {
  try {
    const recipeData = await c.req.json();
    const recipeId = `recipe-${Date.now()}`;
    
    console.log('🍳 Adding new recipe:', {
      id: recipeId,
      name: recipeData.name,
      createdBy: recipeData.createdBy
    });
    
    const recipe = {
      id: recipeId,
      ...recipeData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`recipe:${recipeId}`, recipe);
    
    console.log('✅ Recipe added successfully');
    
    return c.json({
      success: true,
      data: recipe,
      message: 'Recipe added successfully'
    });
  } catch (error) {
    console.error('💥 Error adding recipe:', error);
    return c.json({
      error: 'Failed to add recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Update recipe
app.put('/make-server-3005c377/recipes/:id', async (c) => {
  try {
    const recipeId = c.req.param('id');
    const updateData = await c.req.json();
    
    console.log('🍳 Updating recipe:', {
      id: recipeId,
      name: updateData.name,
      updatedBy: updateData.updatedBy
    });
    
    // Get existing recipe
    const existingRecipe = await kv.get(`recipe:${recipeId}`);
    if (!existingRecipe) {
      return c.json({
        error: 'Recipe not found'
      }, 404);
    }
    
    const updatedRecipe = {
      ...existingRecipe,
      ...updateData,
      id: recipeId,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`recipe:${recipeId}`, updatedRecipe);
    
    console.log('✅ Recipe updated successfully');
    
    return c.json({
      success: true,
      data: updatedRecipe,
      message: 'Recipe updated successfully'
    });
  } catch (error) {
    console.error('💥 Error updating recipe:', error);
    return c.json({
      error: 'Failed to update recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Delete recipe
app.delete('/make-server-3005c377/recipes/:id', async (c) => {
  try {
    const recipeId = c.req.param('id');
    
    console.log('🗑️ Deleting recipe:', recipeId);
    
    const existingRecipe = await kv.get(`recipe:${recipeId}`);
    if (!existingRecipe) {
      return c.json({
        error: 'Recipe not found'
      }, 404);
    }
    
    await kv.del(`recipe:${recipeId}`);
    
    console.log('✅ Recipe deleted successfully');
    
    return c.json({
      success: true,
      message: 'Recipe deleted successfully'
    });
  } catch (error) {
    console.error('💥 Error deleting recipe:', error);
    return c.json({
      error: 'Failed to delete recipe',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Start the server
console.log('🚀 Starting On2Cook server...');
serve(app.fetch);