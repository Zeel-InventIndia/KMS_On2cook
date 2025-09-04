// Google Sheets API service for fetching demo requests
export interface GoogleSheetsRow {
  [key: string]: string;
}

export interface SheetConfig {
  spreadsheetId: string;
  range: string;
  apiKey: string;
}

export class GoogleSheetsService {
  private apiKey: string;
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Validate API key by making a simple test call
  async validateApiKey(): Promise<{ isValid: boolean; error?: string }> {
    try {
      if (!this.apiKey || this.apiKey.trim() === '') {
        return { isValid: false, error: 'API key is empty or not provided' };
      }

      // Test the API key with a simple quota check call
      const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/test?key=${this.apiKey}`;
      const response = await fetch(testUrl);
      
      if (response.status === 403) {
        return { isValid: false, error: 'API key is invalid or access is forbidden' };
      } else if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error?.message?.includes('API key not valid')) {
          return { isValid: false, error: 'API key is not valid. Please check your Google Sheets API key.' };
        }
        // 400 with different error might be OK (like invalid spreadsheet ID)
        return { isValid: true };
      } else if (response.status === 404) {
        // 404 is expected for test spreadsheet, means API key works
        return { isValid: true };
      } else if (response.ok) {
        return { isValid: true };
      }

      return { isValid: false, error: `Unexpected response: ${response.status}` };
    } catch (error) {
      return { isValid: false, error: `Failed to validate API key: ${error.message}` };
    }
  }

  async fetchSheetData(spreadsheetId: string, range: string): Promise<GoogleSheetsRow[]> {
    try {
      // Validate API key first
      const validation = await this.validateApiKey();
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid API key');
      }

      const url = `${this.baseUrl}/${spreadsheetId}/values/${range}?key=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 403) {
          throw new Error('Access forbidden. Please check your Google Sheets API key and ensure the spreadsheet is accessible.');
        } else if (response.status === 404) {
          throw new Error('Spreadsheet or range not found. Please verify the spreadsheet ID and range.');
        } else if (response.status === 400) {
          const errorMessage = errorData.error?.message || response.statusText;
          if (errorMessage.includes('API key not valid')) {
            throw new Error('Invalid Google Sheets API key. Please check your GOOGLE_SHEETS_API_KEY environment variable.');
          }
          throw new Error(`Bad request: ${errorMessage}`);
        } else {
          throw new Error(`Google Sheets API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }
      }

      const data = await response.json();
      
      if (!data.values || !Array.isArray(data.values)) {
        console.log('No data found in sheet or invalid format');
        return [];
      }

      // Convert array of arrays to array of objects using first row as headers
      const [headers, ...rows] = data.values;
      
      if (!headers || headers.length === 0) {
        throw new Error('No headers found in sheet. Please ensure the first row contains column headers.');
      }

      return rows.map(row => {
        const obj: GoogleSheetsRow = {};
        headers.forEach((header: string, index: number) => {
          obj[header.trim()] = row[index] || '';
        });
        return obj;
      });
    } catch (error) {
      console.error('Error fetching Google Sheets data:', error);
      throw error;
    }
  }

  // Transform Google Sheets data to DemoRequest format
  transformToDemoRequests(sheetData: GoogleSheetsRow[]): any[] {
    return sheetData.map((row, index) => {
      // Generate a unique ID if not provided
      const id = row.id || row.ID || `sheet-${Date.now()}-${index}`;
      
      // Parse recipes (expecting comma-separated values)
      const recipes = (row.recipes || row.Recipes || row.RECIPES || '') ? 
        (row.recipes || row.Recipes || row.RECIPES).split(',').map(r => r.trim()).filter(r => r.length > 0) : 
        [];

      // Map sheet columns to DemoRequest properties with flexible column name matching
      return {
        id,
        clientName: row.clientName || row['Client Name'] || row.client || row.Client || '',
        clientMobile: row.clientMobile || row['Client Mobile'] || row.mobile || row.Mobile || row.phone || row.Phone || '',
        clientEmail: row.clientEmail || row['Client Email'] || row.email || row.Email || '',
        demoDate: row.demoDate || row['Demo Date'] || row.date || row.Date || '',
        demoTime: row.demoTime || row['Demo Time'] || row.time || row.Time || '',
        recipes,
        salesRep: row.salesRep || row['Sales Rep'] || row.sales || row.Sales || '',
        leadStatus: this.normalizeLeadStatus(row.leadStatus || row['Lead Status'] || 'demo_planned'),
        specialTag: row.specialTag || row['Special Tag'] || row.tag || row.Tag || null,
        type: this.normalizeType(row.type || row.Type || 'demo'),
        demoMode: this.normalizeDemoMode(row.demoMode || row['Demo Mode'] || 'onsite'),
        notes: row.notes || row.Notes || '',
        assignedTeam: row.assignedTeam || row['Assigned Team'] ? parseInt(row.assignedTeam || row['Assigned Team']) : null,
        assignedSlot: row.assignedSlot || row['Assigned Slot'] || null,
        status: this.normalizeStatus(row.status || row.Status || 'pending'),
        completedBy: row.completedBy || row['Completed By'] || undefined,
        completedAt: row.completedAt || row['Completed At'] || undefined,
        mediaUploaded: (row.mediaUploaded || row['Media Uploaded'] || '').toLowerCase() === 'true',
        dropboxLink: row.dropboxLink || row['Dropbox Link'] || undefined,
        createdAt: row.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
  }

  private normalizeType(type: string): string {
    const validTypes = ['demo', 'deployment', 'recipe_development', 'videoshoot', 'event', 'device_testing'];
    const normalizedType = type.toLowerCase().replace(/\s+/g, '_');
    return validTypes.includes(normalizedType) ? normalizedType : 'demo';
  }

  private normalizeStatus(status: string): string {
    const validStatuses = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'];
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
    return validStatuses.includes(normalizedStatus) ? normalizedStatus : 'pending';
  }

  private normalizeLeadStatus(status: string): string {
    const validStatuses = ['demo_planned', 'demo_rescheduled', 'demo_cancelled', 'demo_given'];
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
    return validStatuses.includes(normalizedStatus) ? normalizedStatus : 'demo_planned';
  }

  private normalizeDemoMode(mode: string): string {
    const validModes = ['onsite', 'virtual'];
    const normalizedMode = mode.toLowerCase();
    return validModes.includes(normalizedMode) ? normalizedMode : 'onsite';
  }

  // Method to validate sheet structure
  async validateSheetStructure(spreadsheetId: string, range: string): Promise<{
    isValid: boolean;
    headers: string[];
    missingColumns: string[];
    suggestions: string[];
  }> {
    try {
      const data = await this.fetchSheetData(spreadsheetId, range);
      
      if (data.length === 0) {
        return {
          isValid: false,
          headers: [],
          missingColumns: [],
          suggestions: ['Sheet appears to be empty or has no data rows']
        };
      }

      const headers = Object.keys(data[0]);
      const requiredColumns = ['clientName', 'salesRep', 'demoDate', 'demoTime'];
      const optionalColumns = ['type', 'recipes', 'status', 'specialTag', 'contactPhone', 'contactEmail', 'notes'];
      
      // Find missing required columns (case-insensitive and flexible matching)
      const missingColumns = requiredColumns.filter(required => {
        const variations = this.getColumnVariations(required);
        return !headers.some(header => 
          variations.some(variation => 
            header.toLowerCase().replace(/\s+/g, '').includes(variation) ||
            variation.includes(header.toLowerCase().replace(/\s+/g, ''))
          )
        );
      });

      const suggestions = [];
      if (missingColumns.length > 0) {
        suggestions.push(`Missing required columns: ${missingColumns.join(', ')}`);
        suggestions.push('Suggested column names: Client Name, Sales Rep, Demo Date, Demo Time');
      }

      if (headers.length < 4) {
        suggestions.push('Sheet should have at least 4 columns for basic functionality');
      }

      return {
        isValid: missingColumns.length === 0,
        headers,
        missingColumns,
        suggestions
      };
    } catch (error) {
      return {
        isValid: false,
        headers: [],
        missingColumns: [],
        suggestions: [`Error validating sheet: ${error.message}`]
      };
    }
  }

  private getColumnVariations(column: string): string[] {
    const variations: { [key: string]: string[] } = {
      clientName: ['clientname', 'client', 'clientname', 'customer', 'customername'],
      salesRep: ['salesrep', 'sales', 'salesrepresentative', 'rep', 'salesperson'],
      demoDate: ['demodate', 'date', 'scheduleddate', 'appointmentdate'],
      demoTime: ['demotime', 'time', 'scheduledtime', 'appointmenttime']
    };
    
    return variations[column] || [column.toLowerCase()];
  }
}