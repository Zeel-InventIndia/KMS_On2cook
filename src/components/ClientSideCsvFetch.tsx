// Helper component to handle client-side CSV fetch with retry logic
// This is extracted to avoid complex edits to the main App.tsx file

import { projectId, publicAnonKey } from '../utils/supabase/info';
import { HARDCODED_CSV_URL } from '../utils/constants';
import { transformClientSideCsvData } from '../utils/csvTransformers';

export async function fetchCsvDataFromClientWithRetry(showLoading = true): Promise<any> {
  console.log('💻 Starting client-side CSV fetch with retry logic');
  console.log('📊 CSV URL:', HARDCODED_CSV_URL);

  // Validate URL format first
  if (!HARDCODED_CSV_URL.includes('docs.google.com/spreadsheets')) {
    throw new Error('Invalid Google Sheets URL format');
  }

  // Retry logic for better resilience
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Client-side retry attempt ${attempt} of ${maxRetries}...`);
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.min(attempt * 2000, 8000)));
      }
      
      console.log('📊 Fetching CSV data directly...');
      
      // Use improved fetch settings for Google Sheets
      const csvResponse = await fetch(HARDCODED_CSV_URL, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv,text/plain,application/csv,*/*',
          'User-Agent': 'On2Cook-Client/1.0',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        mode: 'cors',
        credentials: 'omit',
        signal: AbortSignal.timeout(40000) // 40 second timeout
      });
    
      console.log(`📊 Response: ${csvResponse.status} ${csvResponse.statusText}`);
      console.log(`📊 Content-Type: ${csvResponse.headers.get('content-type')}`);
      
      if (!csvResponse.ok) {
        const errorText = await csvResponse.text().catch(() => 'Unable to read error response');
        console.error('📊 Response error body:', errorText);
        
        // For certain errors, don't retry
        if (csvResponse.status === 404 || csvResponse.status === 403) {
          throw new Error(`CSV fetch failed permanently: HTTP ${csvResponse.status} ${csvResponse.statusText}`);
        }
        
        throw new Error(`CSV fetch failed: HTTP ${csvResponse.status} ${csvResponse.statusText}`);
      }
      
      const csvText = await csvResponse.text();
      console.log('📊 CSV data received, length:', csvText.length);
      console.log('📊 First 200 chars:', csvText.substring(0, 200));
      
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
          signal: AbortSignal.timeout(10000)
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
      
      console.log('✅ Client-side CSV fetch successful');
      return transformedData;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown client-side error');
      console.error(`💻 Client fetch error (attempt ${attempt + 1}):`, error);
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw new Error(`Client-side CSV fetch failed after ${maxRetries + 1} attempts: ${lastError.message}`);
      }
      
      // For network-related errors, retry
      if (error instanceof Error && (
        error.message.includes('timeout') || 
        error.message.includes('network') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('TypeError') ||
        error.name === 'AbortError' ||
        error.name === 'TypeError'
      )) {
        console.log(`🔄 Network-related error, will retry... (${error.message})`);
        continue;
      }
      
      // For permanent errors (404, 403), don't retry
      if (error instanceof Error && (
        error.message.includes('404') ||
        error.message.includes('403') ||
        error.message.includes('permanently')
      )) {
        console.log(`🚫 Permanent error, not retrying: ${error.message}`);
        throw error;
      }
      
      // For other errors, retry
      console.log(`🔄 Retryable error, will retry... (${error instanceof Error ? error.message : 'Unknown'})`);
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new Error('Client-side CSV fetch failed for unknown reasons');
}