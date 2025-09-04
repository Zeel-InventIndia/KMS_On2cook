// Note: This file runs in Deno server environment, so we don't import client utils
import { googleSheetsService } from './googleSheetsServiceAccount.tsx';
import { googleSheetsServiceFixed } from './googleSheetsServiceAccountFixed.tsx';

interface UpdateRowData {
  clientName: string;
  clientEmail: string;
  mediaLink?: string;
  recipes?: string[];
  teamMember?: string;
  notes?: string;
}

export class GoogleSheetsUpdater {
  private spreadsheetId: string;
  private sheetName: string;

  constructor(spreadsheetId?: string, sheetName: string = 'Demo_schedule') {
    // Use provided spreadsheet ID or try to extract from environment
    // Default to production On2Cook spreadsheet ID (hardcoded as backup)
    const envSpreadsheetId = Deno.env.get('ON2COOK_SPREADSHEET_ID');
    const defaultSpreadsheetId = '1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM';
    
    // Ensure we always have a valid spreadsheet ID
    this.spreadsheetId = spreadsheetId || envSpreadsheetId || defaultSpreadsheetId;
    this.sheetName = sheetName;
    
    console.log('🔧 GoogleSheetsUpdater initialized:', {
      providedSpreadsheetId: spreadsheetId,
      envSpreadsheetId: envSpreadsheetId,
      defaultSpreadsheetId: defaultSpreadsheetId,
      finalSpreadsheetId: this.spreadsheetId,
      hasServiceAccount: googleSheetsService.isServiceAccountConfigured(),
      serviceAccountEmail: googleSheetsService.getServiceAccountEmail(),
      sheetName: this.sheetName
    });
    
    // Validate that we have a spreadsheet ID
    if (!this.spreadsheetId || this.spreadsheetId.trim() === '') {
      console.error('❌ No spreadsheet ID available after initialization!');
      // Force set to default if somehow still empty
      this.spreadsheetId = defaultSpreadsheetId;
      console.log('🔧 Forced spreadsheet ID to default:', this.spreadsheetId);
    }

    // Validate that service account is configured - REQUIRED for updates
    if (!googleSheetsService.isServiceAccountConfigured()) {
      console.error('❌ Service account not configured for Google Sheets updates');
      throw new Error('Google Sheets updates require service account authentication. Please set GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON environment variable.');
    }
  }

  /**
   * Update a specific row in Google Sheets with recipes, notes, or media link
   */
  async updateDemoRequest(updateData: UpdateRowData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📝 Starting Google Sheets update for:', updateData.clientName);
      
      // Ensure service account is configured
      if (!googleSheetsService.isServiceAccountConfigured()) {
        throw new Error('Google Sheets updates require service account authentication. Please configure GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON environment variable.');
      }

      // First, get the current sheet data to find the row
      console.log('📊 Fetching current sheet data...');
      const sheetData = await this.getSheetData();
      
      if (!sheetData || sheetData.length === 0) {
        throw new Error('Sheet appears to be empty or inaccessible. Please check that the spreadsheet exists and contains data.');
      }
      
      console.log(`📊 Found ${sheetData.length} rows in sheet`);
      
      // Find the row that matches clientName and clientEmail
      console.log(`🔍 Looking for row with client: ${updateData.clientName}, email: ${updateData.clientEmail}`);
      const rowIndex = this.findRowIndex(sheetData, updateData.clientName, updateData.clientEmail);
      
      if (rowIndex === -1) {
        // Provide more detailed error message about what was searched
        console.error('❌ Row not found. Available clients in sheet:', 
          sheetData.slice(1, Math.min(6, sheetData.length)).map(row => ({
            name: row[0] || 'N/A',
            email: row[1] || 'N/A'
          }))
        );
        throw new Error(`Row not found for client: ${updateData.clientName} (${updateData.clientEmail}). Please verify the client name and email match exactly with the spreadsheet.`);
      }

      console.log(`🎯 Found matching row at index: ${rowIndex}`);

      // Update the row with recipes, notes, and/or media link
      await this.updateDemoRequestRow(rowIndex, updateData);
      
      console.log(`✅ Successfully updated demo request for ${updateData.clientName}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error updating Google Sheets:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get current sheet data to find the target row with fallback mechanisms
   */
  private async getSheetData(): Promise<string[][]> {
    console.log('🔍 getSheetData called - checking spreadsheet ID:', {
      spreadsheetId: this.spreadsheetId,
      spreadsheetIdType: typeof this.spreadsheetId,
      spreadsheetIdLength: this.spreadsheetId?.length,
      sheetName: this.sheetName
    });
    
    if (!this.spreadsheetId || this.spreadsheetId.trim() === '') {
      console.error('❌ Spreadsheet ID validation failed:', {
        spreadsheetId: this.spreadsheetId,
        isUndefined: this.spreadsheetId === undefined,
        isNull: this.spreadsheetId === null,
        isEmpty: this.spreadsheetId === '',
        trimmedLength: this.spreadsheetId?.trim()?.length
      });
      throw new Error('Spreadsheet ID not configured. Please check the spreadsheet URL.');
    }

    // Try multiple approaches to access the sheet data
    const errors: string[] = [];

    // First: Try the fixed service account implementation
    if (googleSheetsServiceFixed.isServiceAccountConfigured()) {
      try {
        console.log('📊 Trying fixed service account implementation...');
        return await googleSheetsServiceFixed.fetchSheetData(this.spreadsheetId, this.sheetName);
      } catch (serviceError) {
        console.warn('⚠️ Fixed service account failed:', serviceError);
        errors.push(`Fixed Service Account: ${serviceError instanceof Error ? serviceError.message : 'Unknown error'}`);
        
        // If JWT signature error, don't try original service account
        if (serviceError instanceof Error && serviceError.message.includes('JWT')) {
          errors.push('Skipping original service account due to JWT signature issues');
        } else {
          // Try original service account
          try {
            console.log('📊 Trying original service account implementation...');
            return await googleSheetsService.fetchSheetData(this.spreadsheetId, this.sheetName);
          } catch (originalError) {
            console.warn('⚠️ Original service account also failed:', originalError);
            errors.push(`Original Service Account: ${originalError instanceof Error ? originalError.message : 'Unknown error'}`);
          }
        }
      }
    }

    // Second: Try public CSV access as fallback
    try {
      console.log('📊 Trying public CSV access as fallback...');
      const csvUrl = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?format=csv&gid=0`;
      
      const response = await fetch(csvUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv,text/plain,*/*',
          'User-Agent': 'On2Cook-Server/1.0'
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('Sorry, unable to open the file') || errorText.includes('Page not found')) {
          errors.push('Public CSV Access: Spreadsheet not shared publicly');
        } else {
          errors.push(`Public CSV Access: HTTP ${response.status}`);
        }
        throw new Error('Public CSV access failed');
      }
      
      const csvText = await response.text();
      
      // Check for HTML error pages
      if (csvText.includes('<!DOCTYPE html>') || csvText.includes('Sorry, unable to open the file')) {
        errors.push('Public CSV Access: Returned HTML error page instead of CSV');
        throw new Error('Public CSV returned HTML error page');
      }
      
      // Parse CSV into array format
      const rows = csvText.split('\n')
        .filter(line => line.trim())
        .map(line => {
          // Simple CSV parsing for fallback
          return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        });
        
      console.log('✅ Successfully fetched sheet data via public CSV access, rows:', rows.length);
      return rows;
      
    } catch (csvError) {
      console.warn('⚠️ Public CSV access failed:', csvError);
      errors.push(`Public CSV Access: ${csvError instanceof Error ? csvError.message : 'Unknown error'}`);
    }

    // All methods failed
    console.error('💥 All sheet access methods failed:', errors);
    throw new Error(`Failed to access Google Sheets data. Attempted methods failed:\n${errors.join('\n')}\n\nPlease either:\n1. Fix service account credentials (GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON)\n2. Share spreadsheet publicly ("Anyone with the link can view")`);
  }

  /**
   * Find the row index that matches client name and email
   */
  private findRowIndex(sheetData: string[][], clientName: string, clientEmail: string): number {
    // Skip header row (index 0), start from index 1
    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      
      // Based on On2Cook format: Full name (A), Email (B), Phone Number (C), Lead status (D), Sales rep (E), Assignee (F), Demo date (G)
      // Column 0: Full name, Column 1: Email
      if (row[0]?.trim() === clientName.trim() && row[1]?.trim() === clientEmail.trim()) {
        return i + 1; // Google Sheets uses 1-based indexing
      }
    }
    
    return -1; // Not found
  }

  /**
   * Update specific columns in a demo request row
   */
  private async updateDemoRequestRow(rowIndex: number, updateData: UpdateRowData): Promise<void> {
    // Based on On2Cook format: Full name (A), Email (B), Phone Number (C), Lead status (D), Sales rep (E), Assignee (F), Demo date (G)
    // Additional columns for system data: Recipes (H), Team Member (I), Notes (J), Media Link (K)
    // Column mapping:
    // H = recipes (8th column)
    // I = team_member (9th column)
    // J = notes (10th column)  
    // K = media_link (11th column)
    
    const updates = [];
    const ranges = [];
    
    if (updateData.recipes !== undefined) {
      const recipesString = Array.isArray(updateData.recipes) ? updateData.recipes.join(', ') : '';
      ranges.push(`${this.sheetName}!H${rowIndex}`);
      updates.push([recipesString]);
    }
    
    if (updateData.teamMember !== undefined) {
      ranges.push(`${this.sheetName}!I${rowIndex}`);
      updates.push([updateData.teamMember]);
    }
    
    if (updateData.notes !== undefined) {
      ranges.push(`${this.sheetName}!J${rowIndex}`);
      updates.push([updateData.notes]);
    }
    
    if (updateData.mediaLink !== undefined) {
      ranges.push(`${this.sheetName}!K${rowIndex}`);
      updates.push([updateData.mediaLink]);
    }

    if (ranges.length === 0) {
      console.log('⚠️ No fields to update');
      return;
    }

    console.log('📝 Updating Google Sheets with:', {
      ranges,
      updates: updates.map((update, i) => ({ [ranges[i]]: update[0] }))
    });

    try {
      // Use service account for all update operations - REQUIRED for robust JWT handling
      if (!googleSheetsService.isServiceAccountConfigured()) {
        throw new Error('Service account authentication is required for Google Sheets updates. Please configure GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON environment variable.');
      }

      console.log('📝 Using service account for batch update');
      const batchUpdates = ranges.map((range, index) => ({
        range,
        values: [updates[index]]
      }));
      await googleSheetsService.batchUpdateSheetData(this.spreadsheetId, batchUpdates);
      console.log(`✅ Successfully updated ${ranges.length} columns in row ${rowIndex} using service account`);
    } catch (error) {
      console.error('📝 Error updating sheet data:', error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async updateMediaLink(updateData: UpdateRowData): Promise<{ success: boolean; error?: string }> {
    return this.updateDemoRequest(updateData);
  }

  /**
   * Batch update multiple rows (for future use)
   */
  async batchUpdateDemoRequests(updates: UpdateRowData[]): Promise<{ success: boolean; results: any[] }> {
    const results = [];
    
    for (const update of updates) {
      const result = await this.updateDemoRequest(update);
      results.push({ ...update, ...result });
    }

    return {
      success: results.every(r => r.success),
      results
    };
  }
}

// Export instance for use in API routes
export const googleSheetsUpdater = new GoogleSheetsUpdater();