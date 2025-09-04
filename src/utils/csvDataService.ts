import { DemoRequest } from '../types/DemoRequest';
import { Task } from '../types/Task';
import { User } from '../types/User';
import { projectId, publicAnonKey } from './supabase/info';
import { HARDCODED_CSV_URL, ALTERNATIVE_CSV_URLS } from './constants';
import { getOn2CookConfig } from './on2cookConfig';
import { transformClientSideCsvData } from './csvTransformers';

export interface CsvDataResult {
  demoRequests: DemoRequest[];
  tasks: Task[];
}

export const fetchCsvDataFromServer = async (showLoading = true): Promise<CsvDataResult> => {
  // First check if server is actually available for CSV processing
  const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health`;
  console.log('🏥 Checking server health:', healthUrl);
  
  try {
    const healthResponse = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!healthResponse.ok) {
      throw new Error(`Server health check failed: ${healthResponse.status}`);
    }
    
    console.log('✅ Server health check passed');
  } catch (healthError) {
    console.log('🏥 Server health check failed:', healthError);
    throw new Error('Server is not available');
  }

  // Proceed with actual CSV fetch
  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/csv/data?` +
    `demoRequestsCsvUrl=${encodeURIComponent(HARDCODED_CSV_URL)}`;
  
  console.log('🌐 Fetching CSV data from server...');

  const response = await fetch(serverUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${publicAnonKey}`,
      'Content-Type': 'application/json'
    },
    signal: AbortSignal.timeout(25000)
  });

  if (!response.ok) {
    let errorMsg = `Server responded with ${response.status}`;
    let isAccessError = false;
    
    // Special handling for 404 errors which typically indicate Google Sheets access issues
    if (response.status === 404) {
      isAccessError = true;
      errorMsg = 'Google Sheets not found (404). Spreadsheet may not be shared properly or URL may be incorrect.';
    } else {
      try {
        // Clone the response to allow multiple reads if needed
        const responseClone = response.clone();
        const errorData = await responseClone.json();
        errorMsg = errorData.error || errorData.details || errorMsg;
        console.error('🌐 Server error details:', errorData);
        
        // Check for Google Sheets access issues
        if (errorData.details && (
          errorData.details.includes('Google Sheets access denied') ||
          errorData.details.includes('400 Bad Request') ||
          errorData.details.includes('Page not found') ||
          errorData.details.includes('Sorry, unable to open the file') ||
          errorData.details.includes('<!DOCTYPE html>')
        )) {
          isAccessError = true;
          errorMsg = 'Google Sheets access denied. Please check spreadsheet sharing permissions.';
        }
      } catch (parseError) {
        console.error('🌐 Failed to parse server error response:', parseError);
        // Try to get raw text error using the original response
        try {
          const errorText = await response.text();
          console.error('🌐 Server error text:', errorText.substring(0, 500));
          if (errorText.includes('Sorry, unable to open the file') || 
              errorText.includes('Page not found') ||
              errorText.includes('<!DOCTYPE html>')) {
            isAccessError = true;
            errorMsg = 'Google Sheets access denied. Received HTML error page instead of data.';
          } else {
            errorMsg += ` - ${errorText.substring(0, 200)}`;
          }
        } catch (textError) {
          console.error('🌐 Failed to read error response as text:', textError);
          errorMsg += ` - Unable to read error details`;
        }
      }
    }
    
    console.error('🌐 Server fetch failed:', errorMsg);
    const error = new Error(errorMsg);
    (error as any).isAccessError = isAccessError;
    throw error;
  }

  const result = await response.json();
  console.log('✅ Server fetch successful');
  
  // Validate the response structure
  if (!result.data || !result.data.demoRequests) {
    console.error('🌐 Invalid server response structure:', result);
    throw new Error('Invalid server response: missing demo requests data');
  }
  
  return result.data;
};

export const fetchCsvDataFromClient = async (showLoading = true): Promise<CsvDataResult> => {
  console.log('💻 Starting client-side CSV fetch');
  
  // Get the configured CSV URL or fallback to hardcoded
  const on2CookConfig = getOn2CookConfig();
  const csvUrl = on2CookConfig.csvUrl || HARDCODED_CSV_URL;
  
  console.log('📊 CSV URL:', csvUrl);

  // Enhanced CSV fetching with reduced URL attempts to prevent spam
  console.log('📊 Fetching CSV data with enhanced error handling...');
  
  // Use the alternative URLs from constants with the configured URL first
  const urlsToTry = [
    // Primary configured URL first
    csvUrl,
    // Then try all alternative URLs from constants
    ...ALTERNATIVE_CSV_URLS
  ].filter((url, index, arr) => arr.indexOf(url) === index); // Remove duplicates
  
  let csvText: string | null = null;
  let lastError: Error | null = null;
  let successfulUrl: string | null = null;
  
  // Try each URL until one works
  for (let i = 0; i < urlsToTry.length; i++) {
    const url = urlsToTry[i];
    console.log(`📊 Attempt ${i + 1}/${urlsToTry.length}: ${url.substring(0, 80)}...`);
    
    try {
      const csvResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv,text/plain,application/csv,*/*',
          'User-Agent': 'On2Cook-Client/1.0',
          'Cache-Control': 'no-cache'
        },
        mode: 'cors',
        credentials: 'omit',
        signal: AbortSignal.timeout(20000)
      });
      
      console.log(`📊 Response ${i + 1}: ${csvResponse.status} ${csvResponse.statusText}`);
      console.log(`📊 Content-Type: ${csvResponse.headers.get('content-type')}`);
      
      if (!csvResponse.ok) {
        let errorText = 'Unable to read error response';
        try {
          errorText = await csvResponse.text();
          console.error(`📊 Error body ${i + 1}:`, errorText.substring(0, 500));
        } catch (textError) {
          console.error(`📊 Failed to read error response ${i + 1}:`, textError);
        }
        
        // Check for specific error patterns that indicate Google Sheets access issues
        if (errorText.includes('Sorry, unable to open the file') || 
            errorText.includes('Page not found') ||
            errorText.includes('<!DOCTYPE html>') ||
            csvResponse.status === 404 ||
            csvResponse.status === 403) {
          lastError = new Error('Google Sheets access denied. Spreadsheet may not be shared properly or URL may be incorrect.');
          // Don't continue to try more URLs if we get a clear access denial
          if (errorText.includes('Sorry, unable to open the file') || errorText.includes('Page not found')) {
            console.log('📊 Received clear Google Sheets access denial, stopping URL attempts');
            break;
          }
          continue; // Try next URL for other errors
        }
        
        lastError = new Error(`HTTP ${csvResponse.status}: ${errorText.substring(0, 200)}`);
        continue; // Try next URL
      }
      
      const responseText = await csvResponse.text();
      console.log(`📊 Response text length ${i + 1}:`, responseText.length);
      console.log(`📊 First 200 chars ${i + 1}:`, responseText.substring(0, 200));
      
      // Check if response is actually CSV (not HTML error page)
      if (responseText.includes('<!DOCTYPE html>') || 
          responseText.includes('<html') ||
          responseText.includes('Sorry, unable to open the file') ||
          responseText.includes('Page not found')) {
        console.warn(`📊 URL ${i + 1} returned HTML instead of CSV`);
        lastError = new Error('Google Sheets returned HTML page instead of CSV - access denied');
        continue; // Try next URL
      }
      
      // Basic CSV validation
      if (responseText.length < 50 || !responseText.includes(',')) {
        console.warn(`📊 URL ${i + 1} returned invalid CSV (too short or no commas)`);
        lastError = new Error('Invalid CSV format');
        continue; // Try next URL
      }
      
      // Success!
      csvText = responseText;
      successfulUrl = url;
      console.log(`✅ Success with URL ${i + 1}: ${url.substring(0, 80)}...`);
      break;
      
    } catch (error) {
      console.error(`📊 URL ${i + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error(`URL ${i + 1} fetch failed`);
      continue; // Try next URL
    }
  }
  
  // Check if any URL worked
  if (!csvText || !successfulUrl) {
    console.error('📊 All URLs failed. Last error:', lastError);
    const finalError = new Error(
      `Google Sheets access failed after trying ${urlsToTry.length} different approaches. ` +
      `This usually indicates the spreadsheet is not shared publicly or the URL is incorrect. ` +
      `Falling back to sample data for demonstration.`
    );
    (finalError as any).isAccessError = true;
    throw finalError;
  }
  
  console.log('📊 CSV data successfully retrieved');
  console.log('📊 Data length:', csvText.length);
  console.log('📊 Successful URL:', successfulUrl);
  
  if (!csvText || csvText.length < 10) {
    throw new Error('CSV data is empty or too short');
  }
  
  // Improved CSV parsing that handles Google Sheets format
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedText.split('\n').filter(line => line.trim().length > 0);
  
  const data = lines.map(line => {
    // Robust CSV parsing - handle quotes and commas inside fields
    const result = [];
    let current = '';
    let inQuotes = false;
    let escaped = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (escaped) {
        current += char;
        escaped = false;
      } else if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Double quote escape
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === '\\') {
        escaped = true;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add the last column
    result.push(current.trim());
    
    // Clean up any remaining quotes
    return result.map(col => {
      const trimmed = col.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1);
      }
      return trimmed;
    });
  });
  
  console.log('📊 CSV parsed successfully, rows:', data.length);
  if (data.length > 0) {
    console.log('📊 Header row:', data[0]);
    console.log('📊 Sample data row:', data[1]);
  }

  // Transform the data using the extracted transformer
  let transformedData = transformClientSideCsvData(data);
  console.log('🔄 Data transformation complete');
  
  // Merge with backend-stored demo requests (for recipe updates) - CLIENT SIDE MERGE
  try {
    console.log('🔗 Client-side: Merging with backend-stored demo requests...');
    const backendResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/demo-requests`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(8000) // Reduced timeout
    });
    
    if (backendResponse.ok) {
      const backendResult = await backendResponse.json();
      const backendDemoRequests = backendResult.data || [];
      console.log(`🔍 Client-side: Found ${backendDemoRequests.length} backend demo requests to merge`);
      
      if (backendDemoRequests.length > 0) {
        console.log(`🔍 Client-side: Sample backend demo:`, backendDemoRequests[0]);
        
        // Create a map of backend requests by client details for merging
        const backendRequestsMap = new Map();
        backendDemoRequests.forEach((demo: any) => {
          if (demo && demo.clientName && demo.clientEmail) {
            const key = `${demo.clientName.toLowerCase()}:${demo.clientEmail.toLowerCase()}:${demo.clientMobile || ''}`;
            backendRequestsMap.set(key, demo);
            console.log(`🔍 Client-side: Added backend demo to map:`, {
              key,
              clientName: demo.clientName,
              recipesCount: demo.recipes?.length || 0,
              updatedBy: demo.updatedBy
            });
          }
        });
        
        console.log(`🔍 Client-side: Backend map keys:`, Array.from(backendRequestsMap.keys()));
        
        // Merge CSV data with backend data
        const mergedDemoRequests = transformedData.demoRequests.map((csvDemo: any) => {
          if (!csvDemo || !csvDemo.clientName || !csvDemo.clientEmail) {
            return csvDemo;
          }
          
          const key = `${csvDemo.clientName.toLowerCase()}:${csvDemo.clientEmail.toLowerCase()}:${csvDemo.clientMobile || ''}`;
          const backendDemo = backendRequestsMap.get(key);
          
          console.log(`🔍 Client-side: Looking for key "${key}" in backend map`);
          
          if (backendDemo) {
            console.log(`🔗 Client-side: FOUND MATCH! Merging backend data for ${csvDemo.clientName}:`, {
              csvRecipes: csvDemo.recipes?.length || 0,
              backendRecipes: backendDemo.recipes?.length || 0,
              finalRecipes: (backendDemo.recipes || csvDemo.recipes)?.length || 0,
              backendUpdatedBy: backendDemo.updatedBy,
              backendUpdatedAt: backendDemo.updatedAt
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
        });
        
        transformedData = {
          ...transformedData,
          demoRequests: mergedDemoRequests
        };
        
        console.log('✅ Client-side merge completed successfully');
        console.log(`🔍 Final merge result: ${mergedDemoRequests.length} demo requests processed`);
      }
    } else {
      console.warn('⚠️ Client-side: Failed to fetch backend demo requests, proceeding without merge');
    }
  } catch (mergeError) {
    console.warn('⚠️ Client-side: Error during backend merge, proceeding without merge:', mergeError);
  }
  
  return transformedData;
};