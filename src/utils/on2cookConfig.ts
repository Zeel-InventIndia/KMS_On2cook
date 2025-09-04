// On2Cook specific configuration

// Default configuration using the production On2Cook spreadsheet
export const ON2COOK_CONFIG = {
  // Production On2Cook spreadsheet ID
  spreadsheetId: '1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM',
  sheetName: 'Demo_schedule',
  // CSV export URL for the production spreadsheet
  csvUrl: 'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455',
};

// Extract spreadsheet ID from various Google Sheets URL formats
export function extractSpreadsheetId(url: string): string {
  try {
    // Handle different Google Sheets URL formats
    if (url.includes('/spreadsheets/d/')) {
      // Format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        return match[1];
      }
    } else if (url.includes('/spreadsheets/u/')) {
      // Format: https://docs.google.com/spreadsheets/u/0/d/SPREADSHEET_ID/edit#gid=0
      const match = url.match(/\/spreadsheets\/u\/\d+\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        return match[1];
      }
    }
    
    throw new Error('Could not extract spreadsheet ID from URL');
  } catch (error) {
    console.error('Error extracting spreadsheet ID:', error);
    throw error;
  }
}

// Generate CSV export URL from spreadsheet ID
export function generateCsvUrl(spreadsheetId: string, sheetGid: string = '964863455'): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetGid}`;
}

// Update the configuration with user's spreadsheet details
export function updateOn2CookConfig(config: {
  spreadsheetId: string;
  sheetName: string;
  csvUrl: string;
}) {
  ON2COOK_CONFIG.spreadsheetId = config.spreadsheetId;
  ON2COOK_CONFIG.sheetName = config.sheetName;
  ON2COOK_CONFIG.csvUrl = config.csvUrl;
  
  // Store in localStorage for persistence
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('on2cook_config', JSON.stringify(config));
  }
}

// Load configuration from localStorage
export function loadOn2CookConfig(): boolean {
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem('on2cook_config');
      if (stored) {
        const config = JSON.parse(stored);
        updateOn2CookConfig(config);
        return true;
      }
    } catch (error) {
      console.error('Error loading On2Cook config:', error);
    }
  }
  return false;
}

// Check if configuration is complete
export function isOn2CookConfigured(): boolean {
  return Boolean(
    ON2COOK_CONFIG.spreadsheetId && 
    ON2COOK_CONFIG.sheetName && 
    ON2COOK_CONFIG.csvUrl
  );
}

// Get the current configuration
export function getOn2CookConfig() {
  return { ...ON2COOK_CONFIG };
}