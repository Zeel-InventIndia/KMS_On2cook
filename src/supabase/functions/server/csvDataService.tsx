/**
 * CSV Data Service for server-side CSV processing
 * Handles fetching and parsing CSV data from Google Sheets
 */

import { parseCsvDateAndTime, normalizeLeadStatus } from './csvParser.tsx';

export interface ProcessedDemoRequest {
  id: string;
  clientName: string;
  clientMobile: string;
  clientEmail: string;
  assignee: string;
  salesRep: string;
  leadStatus: 'demo_planned' | 'demo_rescheduled' | 'demo_cancelled' | 'demo_given';
  demoDate: string;
  demoTime: string;
  recipes: string[];
  type: 'demo';
  demoMode: 'onsite';
  notes?: string;
  assignedTeam?: number;
  assignedSlot?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  mediaUploaded?: boolean;
  dropboxLink?: string;
  mediaLink?: string;
  statusChangedAt: string;
  assignedMembers: string[];
  // Schedule restoration fields
  scheduledTeam?: string;
  scheduledTimeSlot?: string;
}

export interface CsvDataResult {
  demoRequests: ProcessedDemoRequest[];
  tasks: any[]; // Empty for now since we don't have task data in CSV
}

// On2Cook Production Spreadsheet Configuration
const ON2COOK_SPREADSHEET_ID = '1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM';
const ON2COOK_DEMO_SHEET = 'Demo_schedule';
const ON2COOK_KITCHEN_SHEET = 'kitchen_request';

// Alternative CSV export URL formats to try for demo sheet - using correct gid
const DEMO_CSV_URL_FORMATS = [
  // Standard export formats with correct gid=964863455 (Demo_schedule sheet)
  `https://docs.google.com/spreadsheets/d/${ON2COOK_SPREADSHEET_ID}/export?format=csv&gid=964863455`,
  `https://docs.google.com/spreadsheets/d/${ON2COOK_SPREADSHEET_ID}/export?exportFormat=csv&gid=964863455`,
  // Try with gid=0 as fallback (might be first sheet)
  `https://docs.google.com/spreadsheets/d/${ON2COOK_SPREADSHEET_ID}/export?format=csv&gid=0`,
  // No gid (exports the first/active sheet)
  `https://docs.google.com/spreadsheets/d/${ON2COOK_SPREADSHEET_ID}/export?format=csv`,
  // Query-based export with correct gid
  `https://docs.google.com/spreadsheets/d/${ON2COOK_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=964863455`,
  // Query-based export without gid
  `https://docs.google.com/spreadsheets/d/${ON2COOK_SPREADSHEET_ID}/gviz/tq?tqx=out:csv`,
  // Published CSV (requires the sheet to be published to web) - using correct gid
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT_NxYVOE-M4nB2UQLWkI7VIZeX7lZbBxOzBCUg3tT9jFtLFMQ0iA-kL8wP5-RdLIbQFgOZy4pJ9M4h/pub?gid=964863455&single=true&output=csv',
  // Published CSV fallback without gid
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT_NxYVOE-M4nB2UQLWkI7VIZeX7lZbBxOzBCUg3tT9jFtLFMQ0iA-kL8wP5-RdLIbQFgOZy4pJ9M4h/pub?output=csv'
];

// Kitchen requests sheet URLs - we'll determine the correct GID programmatically or use the service account
// For now, we'll rely on the service account API to access the sheet by name
const KITCHEN_CSV_URL_FORMATS = [
  // These URLs are fallbacks, but we'll primarily use service account API
  `https://docs.google.com/spreadsheets/d/${ON2COOK_SPREADSHEET_ID}/export?format=csv&gid=1`,
  `https://docs.google.com/spreadsheets/d/${ON2COOK_SPREADSHEET_ID}/export?exportFormat=csv&gid=1`,
  `https://docs.google.com/spreadsheets/d/${ON2COOK_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=1`
];

/**
 * Fetches and parses CSV data from the provided URLs with fallback support
 * Now fetches from both Demo_schedule and kitchen_request sheets
 */
export async function fetchCsvData(
  demoRequestsCsvUrl: string, 
  tasksCsvUrl?: string
): Promise<CsvDataResult> {
  console.log('🔄 Server-side CSV processing started (dual-sheet mode)');
  console.log('📊 Demo requests URL:', demoRequestsCsvUrl);
  console.log('📋 Tasks URL:', tasksCsvUrl || 'Not provided');

  // Check if we should use the production On2Cook URLs instead
  let demoUrlsToTry = [demoRequestsCsvUrl];
  let kitchenUrlsToTry: string[] = [];
  
  // If the provided URL is for the On2Cook spreadsheet, add our alternative formats
  if (demoRequestsCsvUrl.includes(ON2COOK_SPREADSHEET_ID)) {
    console.log('🎯 Detected On2Cook spreadsheet, adding alternative URL formats for both sheets');
    demoUrlsToTry = DEMO_CSV_URL_FORMATS;
    kitchenUrlsToTry = KITCHEN_CSV_URL_FORMATS;
  }

  let lastError: Error | null = null;

  // First, try to fetch from Demo_schedule sheet
  let demoRequests: ProcessedDemoRequest[] = [];
  console.log('📊 Fetching from Demo_schedule sheet...');
  
  for (let i = 0; i < demoUrlsToTry.length; i++) {
    const currentUrl = demoUrlsToTry[i];
    console.log(`🔄 Attempting Demo CSV fetch (${i + 1}/${demoUrlsToTry.length}): ${currentUrl}`);
    
    try {
      const result = await fetchCsvFromSingleUrl(currentUrl, tasksCsvUrl);
      console.log(`✅ Successfully fetched Demo CSV data using format ${i + 1}`);
      demoRequests = result.demoRequests;
      break;
    } catch (error) {
      console.warn(`⚠️ Failed with Demo URL format ${i + 1}:`, error instanceof Error ? error.message : 'Unknown error');
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }
  }

  // Next, try to fetch from kitchen_request sheet using service account API
  let kitchenRequests: ProcessedDemoRequest[] = [];
  console.log('🍳 Fetching from kitchen_request sheet...');
  
  // Try service account API first for kitchen requests
  try {
    const googleServiceAccountJson = Deno.env.get('GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON');
    if (googleServiceAccountJson) {
      console.log('🔐 Using service account to fetch kitchen_request sheet...');
      const { googleSheetsServiceFixed } = await import('./googleSheetsServiceAccountFixed.tsx');
      
      const kitchenSheetData = await googleSheetsServiceFixed.fetchSheetData(ON2COOK_SPREADSHEET_ID, 'kitchen_request');
      
      if (kitchenSheetData && kitchenSheetData.length > 1) {
        kitchenRequests = kitchenSheetData.slice(1).map((row, index) => ({
          id: `kitchen-${index + 1}`,
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
        
        console.log(`✅ Service account kitchen_request fetch successful: ${kitchenRequests.length} requests`);
      } else {
        console.log('📄 kitchen_request sheet is empty or has no data rows');
      }
    }
  } catch (kitchenError) {
    console.warn('⚠️ Service account kitchen_request fetch failed:', kitchenError instanceof Error ? kitchenError.message : 'Unknown error');
    
    // Fall back to CSV URLs if service account fails
    if (kitchenUrlsToTry.length > 0) {
      for (let i = 0; i < kitchenUrlsToTry.length; i++) {
        const currentUrl = kitchenUrlsToTry[i];
        console.log(`🔄 Attempting Kitchen CSV fetch (${i + 1}/${kitchenUrlsToTry.length}): ${currentUrl}`);
        
        try {
          const result = await fetchCsvFromSingleUrl(currentUrl, undefined);
          console.log(`✅ Successfully fetched Kitchen CSV data using format ${i + 1}`);
          // Mark kitchen requests with special source
          kitchenRequests = result.demoRequests.map(req => ({
            ...req,
            source: 'kitchen_request',
            id: `kitchen-${req.id}` // Prefix to distinguish from demo sheet requests
          }));
          break;
        } catch (error) {
          console.warn(`⚠️ Failed with Kitchen URL format ${i + 1}:`, error instanceof Error ? error.message : 'Unknown error');
          // Don't fail if kitchen sheet can't be accessed - it might not exist yet
          console.log('📄 Kitchen sheet fetch failed, continuing with demo sheet data only');
        }
      }
    }
  }

  // Combine both sets of requests
  const allDemoRequests = [...demoRequests, ...kitchenRequests];
  console.log(`🔗 Combined requests: ${demoRequests.length} from Demo_schedule + ${kitchenRequests.length} from kitchen_request = ${allDemoRequests.length} total`);

  if (allDemoRequests.length === 0 && lastError) {
    console.error('💥 All CSV URL formats failed');
    throw lastError;
  }

  return {
    demoRequests: allDemoRequests,
    tasks: [] // Still empty for now
  };
}

/**
 * Fetches CSV data from a single URL
 */
async function fetchCsvFromSingleUrl(
  demoRequestsCsvUrl: string, 
  tasksCsvUrl?: string
): Promise<CsvDataResult> {
  // Fetch demo requests CSV with improved error handling
  console.log('📥 Fetching demo requests CSV...');
  console.log('🔗 Full URL:', demoRequestsCsvUrl);
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
  
  let demoResponse;
  try {
    demoResponse = await fetch(demoRequestsCsvUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'On2Cook-Server/1.0',
        'Accept': 'text/csv,text/plain,application/csv,*/*',
        'Accept-Encoding': 'identity', // Don't use compression to avoid issues
        'Cache-Control': 'no-cache'
      },
      redirect: 'follow',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    console.log(`📊 Response status: ${demoResponse.status} ${demoResponse.statusText}`);
    console.log(`📊 Response headers:`, Object.fromEntries(demoResponse.headers.entries()));

    if (!demoResponse.ok) {
      const errorBody = await demoResponse.text();
      console.error(`❌ HTTP Error Response Body:`, errorBody);
      
      // Enhanced Google Sheets access issue detection
      if (errorBody.includes('Sorry, unable to open the file') || 
          errorBody.includes('Page not found') ||
          errorBody.includes('<title>Page not found</title>') ||
          errorBody.includes('<!DOCTYPE html') ||
          demoResponse.status === 400 || 
          demoResponse.status === 403 ||
          demoResponse.status === 404) {
        
        // Provide specific error messages based on the error content
        if (errorBody.includes('Sorry, unable to open the file')) {
          throw new Error('Google Sheets access denied: File permission error. The spreadsheet sharing must be set to "Anyone with the link can view".');
        } else if (errorBody.includes('Page not found')) {
          throw new Error('Google Sheets access denied: Spreadsheet not found or not shared publicly. Check the spreadsheet ID and sharing settings.');
        } else if (demoResponse.status === 400) {
          throw new Error('Google Sheets access denied: Bad Request (400). The spreadsheet is not configured for public CSV access.');
        } else if (demoResponse.status === 403) {
          throw new Error('Google Sheets access denied: Forbidden (403). The spreadsheet permissions do not allow public access.');
        } else if (demoResponse.status === 404) {
          throw new Error('Google Sheets access denied: Not Found (404). The spreadsheet URL may be incorrect or the spreadsheet may have been deleted.');
        } else {
          throw new Error('Google Sheets access denied: Received HTML error page instead of CSV. Please check spreadsheet sharing permissions.');
        }
      }
      
      throw new Error(`Failed to fetch demo requests CSV: ${demoResponse.status} ${demoResponse.statusText}`);
    }
    
  } catch (fetchError) {
    clearTimeout(timeoutId);
    if (fetchError.name === 'AbortError') {
      throw new Error('CSV fetch timeout - server took too long to respond');
    }
    throw fetchError;
  }

  try {
    const demoCsvText = await demoResponse.text();
    console.log(`📄 Demo CSV length: ${demoCsvText.length} characters`);
    
    // Log first few characters of CSV for debugging
    console.log(`📊 CSV preview (first 500 chars):`, demoCsvText.substring(0, 500));
    
    // Check if we got HTML instead of CSV
    if (demoCsvText.trim().startsWith('<!DOCTYPE html') || 
        demoCsvText.includes('<html') ||
        demoCsvText.includes('Sorry, unable to open the file') ||
        demoCsvText.includes('Page not found')) {
      console.error(`❌ Received HTML instead of CSV data`);
      throw new Error('Google Sheets access denied. Received HTML error page instead of CSV data. Please check sharing permissions.');
    }

    // Parse CSV text into rows
    const demoRows = parseCsvText(demoCsvText);
    console.log(`📊 Parsed ${demoRows.length} demo CSV rows (including header)`);
    
    // Validate CSV structure
    if (demoRows.length === 0) {
      console.warn('⚠️ No rows found in CSV data');
      return { demoRequests: [], tasks: [] };
    }

    // Transform demo data
    const demoRequests = transformDemoRequests(demoRows);
    console.log(`✅ Processed ${demoRequests.length} demo requests`);

    // For now, we don't have tasks in the CSV, so return empty array
    const tasks: any[] = [];

    const result: CsvDataResult = {
      demoRequests,
      tasks
    };

    console.log('🎉 Server-side CSV processing completed successfully');
    return result;

  } catch (error) {
    console.error('💥 Error in server-side CSV processing:', error);
    throw new Error(`CSV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parses CSV text into rows of data with improved parsing for Google Sheets
 */
function parseCsvText(csvText: string): string[][] {
  // Handle different line endings and normalize
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n');
  const rows: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    // More robust CSV parsing that handles quotes and commas inside fields
    const columns = [];
    let current = '';
    let inQuotes = false;
    let escaped = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (escaped) {
        current += char;
        escaped = false;
      } else if (char === '"') {
        if (inQuotes && j + 1 < line.length && line[j + 1] === '"') {
          // Double quote escape
          current += '"';
          j++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === '\\') {
        escaped = true;
      } else if (char === ',' && !inQuotes) {
        columns.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last column
    columns.push(current.trim());
    
    // Clean up any remaining quotes
    const cleanColumns = columns.map(col => {
      const trimmed = col.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1);
      }
      return trimmed;
    });

    rows.push(cleanColumns);
  }

  console.log(`📊 Parsed ${rows.length} CSV rows with improved parser`);
  return rows;
}

/**
 * Transforms raw CSV rows into processed demo requests
 */
function transformDemoRequests(rows: string[][]): ProcessedDemoRequest[] {
  if (rows.length <= 1) {
    console.warn('⚠️ No data rows found in CSV (only header or empty)');
    return [];
  }

  // Log the header row for debugging
  console.log('📊 CSV Header row:', rows[0]);
  console.log('📊 CSV structure analysis:');
  if (rows.length > 1) {
    console.log('📊 First data row:', rows[1]);
    console.log('📊 Data row length:', rows[1].length);
  }

  // Skip header row and process data rows with deduplication
  const dataRows = rows.slice(1);
  const demoRequests: ProcessedDemoRequest[] = [];
  const duplicateTracker = new Map<string, ProcessedDemoRequest>();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    
    try {
      const transformedRequest = transformSingleDemoRequest(row, i);
      if (transformedRequest) {
        // Create unique identifier based on client details
        const uniqueKey = `${transformedRequest.clientName.toLowerCase()}:${transformedRequest.clientEmail.toLowerCase()}:${transformedRequest.clientMobile}`;
        
        // Check for existing request
        const existingRequest = duplicateTracker.get(uniqueKey);
        
        if (existingRequest) {
          console.log(`🔄 DEDUPLICATION: Found duplicate for ${transformedRequest.clientName}, updating existing record`);
          console.log(`   - Old status: ${existingRequest.leadStatus}`);
          console.log(`   - New status: ${transformedRequest.leadStatus}`);
          
          // Update the existing request with new information
          const updatedRequest = {
            ...existingRequest,
            ...transformedRequest,
            // Keep the original ID to maintain consistency
            id: existingRequest.id,
            // Track status changes
            previousStatus: existingRequest.leadStatus !== transformedRequest.leadStatus ? existingRequest.leadStatus : undefined,
            statusChangedAt: existingRequest.leadStatus !== transformedRequest.leadStatus ? new Date().toISOString() : existingRequest.statusChangedAt
          };
          
          duplicateTracker.set(uniqueKey, updatedRequest);
          
          // Update the corresponding entry in the results array
          const index = demoRequests.findIndex(req => req.id === existingRequest.id);
          if (index !== -1) {
            demoRequests[index] = updatedRequest;
          }
        } else {
          console.log(`🆕 NEW REQUEST: ${transformedRequest.clientName}`);
          duplicateTracker.set(uniqueKey, transformedRequest);
          demoRequests.push(transformedRequest);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing row ${i + 2}:`, error, row);
      // Continue processing other rows instead of failing completely
    }
  }

  console.log(`✅ Deduplication complete: ${rows.length - 1} rows processed → ${demoRequests.length} unique demo requests`);
  return demoRequests;
}

/**
 * Transforms a single CSV row into a demo request
 */
function transformSingleDemoRequest(row: string[], index: number): ProcessedDemoRequest | null {
  // Log the raw row data for debugging
  console.log(`🔍 Raw row ${index + 2} data:`, row);
  console.log(`🔍 Row length: ${row.length}`);
  
  // Safety check for minimum required columns
  if (row.length < 6) {
    console.warn(`⚠️ Skipping row ${index + 2}: insufficient columns (has ${row.length}, needs at least 6)`);
    return null;
  }
  
  // Pad the row with empty strings if it's shorter than expected
  const paddedRow = [...row];
  while (paddedRow.length < 13) {
    paddedRow.push('');
  }
  
  // CORRECTED CSV FORMAT to match actual Google Sheets:
  // Full name, Email, Phone Number, Lead status, Sales rep, Assignee, Demo date
  const [
    clientName = '',
    clientEmail = '',
    clientMobile = '',
    leadStatus = 'demo_planned',
    salesRep = '',
    assignee = '',
    demoDateTime = '',
    recipes = '',
    teamAssignment = '',    // Column I: Team Assignment (team member names and time slot)
    mediaLink = '',
    assignedTeam = '',
    assignedSlot = '',
    status = 'pending'
  ] = paddedRow;

  // Log field mappings for debugging - CORRECTED ORDER
  console.log(`🔍 Field mappings for row ${index + 2}:`, {
    'Field 0 (clientName)': clientName,
    'Field 1 (clientEmail)': clientEmail,
    'Field 2 (clientMobile)': clientMobile,
    'Field 3 (leadStatus)': leadStatus,
    'Field 4 (salesRep)': salesRep,
    'Field 5 (assignee)': assignee,
    'Field 6 (demoDateTime)': demoDateTime,
    'Field 7 (recipes)': recipes
  });

  // Validate required fields with null/undefined safety
  const trimmedClientName = clientName != null ? String(clientName).trim() : '';
  const trimmedClientEmail = clientEmail != null ? String(clientEmail).trim() : '';
  const trimmedAssignee = assignee != null ? String(assignee).trim() : '';
  
  if (!trimmedClientName || !trimmedAssignee || !trimmedClientEmail) {
    console.warn(`⚠️ Skipping row ${index + 2}: missing required fields (clientName: "${trimmedClientName}", clientEmail: "${trimmedClientEmail}", assignee: "${trimmedAssignee}")`);
    return null;
  }

  // Parse date and time
  const { date: parsedDate, time: parsedTime } = parseCsvDateAndTime(demoDateTime);

  // Parse schedule information from Column I (teamAssignment)
  let scheduledTeam = null;
  let scheduledTimeSlot = null;
  let assignedMembers: string[] = [];
  
  const teamAssignmentStr = String(teamAssignment).trim();
  console.log(`🔍 CSV DEBUG - Team assignment for ${trimmedClientName}:`, teamAssignmentStr);
  
  if (teamAssignmentStr) {
    // Parse various formats of team assignment:
    // Format 1: "Team member names" (just names)
    // Format 2: "Team member names | Time slot" (names with time)
    // Format 3: "Scheduled: Team X at Y (Grid: row,col)" (legacy format)
    
    // Check for legacy schedule pattern first
    const legacyScheduleMatch = teamAssignmentStr.match(/Scheduled:\s*(.+?)\s+at\s+(.+?)\s+\(Grid:\s*(\d+),(\d+)\)/);
    if (legacyScheduleMatch) {
      scheduledTeam = legacyScheduleMatch[1];
      scheduledTimeSlot = legacyScheduleMatch[2];
      console.log(`📍 Found legacy schedule info for ${trimmedClientName}: ${scheduledTeam} at ${scheduledTimeSlot}`);
      
      // Extract individual team member names from team assignment
      if (scheduledTeam) {
        assignedMembers = scheduledTeam.split(',').map(name => name.trim()).filter(Boolean);
      }
    } else {
      // Parse modern format: "Team member names | Time slot" or just "Team member names"
      const parts = teamAssignmentStr.split('|').map(part => part.trim());
      
      if (parts.length >= 1) {
        // First part contains team member names
        const memberNames = parts[0];
        if (memberNames) {
          assignedMembers = memberNames.split(',').map(name => name.trim()).filter(Boolean);
          console.log(`👥 Found assigned members for ${trimmedClientName}:`, assignedMembers);
        }
      }
      
      if (parts.length >= 2) {
        // Second part contains time slot
        scheduledTimeSlot = parts[1];
        console.log(`⏰ Found scheduled time for ${trimmedClientName}:`, scheduledTimeSlot);
      }
      
      // Try to determine team number from assigned members
      if (assignedMembers.length > 0) {
        // Define team groups to match the updated 5-team structure
        const TEAM_GROUPS = {
          1: ['Manish', 'Pran Krishna'],
          2: ['Shahid', 'Kishore'], 
          3: ['Vikas', 'Krishna'],
          4: ['Bikram', 'Ganesh'],
          5: ['Prathimesh', 'Rajesh', 'Suresh']
        };
        
        // Find which team these members belong to (updated for 5 teams)
        for (let teamNum = 1; teamNum <= 5; teamNum++) {
          const teamMembers = TEAM_GROUPS[teamNum as keyof typeof TEAM_GROUPS] || [];
          const hasTeamMember = assignedMembers.some(member => 
            teamMembers.some(teamMember => 
              teamMember.toLowerCase().includes(member.toLowerCase()) ||
              member.toLowerCase().includes(teamMember.toLowerCase())
            )
          );
          
          if (hasTeamMember) {
            scheduledTeam = `Team ${teamNum}`;
            console.log(`📍 Determined team from members for ${trimmedClientName}: ${scheduledTeam}`);
            break;
          }
        }
      }
    }
  }

  // Normalize lead status with additional safety check
  console.log(`🔍 About to normalize lead status: "${leadStatus}"`);
  
  // Additional validation for leadStatus - check if it looks like a valid status
  const leadStatusStr = String(leadStatus).trim();
  const validStatusKeywords = ['demo', 'planned', 'given', 'cancelled', 'rescheduled', 'completed'];
  const isValidStatus = validStatusKeywords.some(keyword => 
    leadStatusStr.toLowerCase().includes(keyword)
  );
  
  if (!isValidStatus && leadStatusStr.length > 0) {
    console.warn(`⚠️ Row ${index + 2}: "${leadStatusStr}" doesn't look like a valid lead status. This might indicate incorrect column mapping.`);
  }
  
  const normalizedLeadStatus = normalizeLeadStatus(leadStatus);

  console.log(`📝 Processing row ${index + 2}:`, {
    clientName: trimmedClientName,
    assignee: trimmedAssignee,
    rawLeadStatus: leadStatus,
    normalizedLeadStatus: normalizedLeadStatus,
    date: parsedDate,
    time: parsedTime
  });

  const transformedRequest: ProcessedDemoRequest = {
    id: `csv-demo-${index + 1}`,
    clientName: trimmedClientName,
    clientMobile: String(clientMobile).trim(),
    clientEmail: String(clientEmail).trim(),
    assignee: trimmedAssignee.toLowerCase(), // Normalize for matching
    salesRep: String(salesRep).trim(),
    leadStatus: normalizedLeadStatus,
    demoDate: parsedDate,
    demoTime: parsedTime,
    recipes: String(recipes).split(',').map(r => r.trim()).filter(Boolean),
    type: 'demo' as const,
    demoMode: 'onsite' as const,
    notes: teamAssignmentStr, // Store team assignment info in notes
    assignedTeam: String(assignedTeam).trim() ? parseInt(String(assignedTeam).trim()) : undefined,
    assignedSlot: String(assignedSlot).trim() || undefined,
    status: ['pending', 'assigned', 'in_progress', 'completed'].includes(String(status).trim())
      ? String(status).trim() as 'pending' | 'assigned' | 'in_progress' | 'completed'
      : 'pending',
    mediaUploaded: Boolean(String(mediaLink).trim()),
    dropboxLink: String(mediaLink).trim() || undefined,
    mediaLink: String(mediaLink).trim() || undefined,
    statusChangedAt: new Date().toISOString(),
    assignedMembers: assignedMembers,
    // Add schedule restoration fields
    scheduledTeam: scheduledTeam,
    scheduledTimeSlot: scheduledTimeSlot
  };

  return transformedRequest;
}