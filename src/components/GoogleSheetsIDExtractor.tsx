import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertCircle, ExternalLink, Copy, Info } from 'lucide-react';

interface GoogleSheetsIDExtractorProps {
  onSpreadsheetConfigured: (config: {
    spreadsheetId: string;
    sheetName: string;
    csvUrl: string;
  }) => void;
}

export function GoogleSheetsIDExtractor({ onSpreadsheetConfigured }: GoogleSheetsIDExtractorProps) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [extractedConfig, setExtractedConfig] = useState<{
    spreadsheetId: string;
    sheetName: string;
    csvUrl: string;
  } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [validationSuccess, setValidationSuccess] = useState<string>('');

  const extractSpreadsheetConfig = (url: string) => {
    try {
      // Handle different Google Sheets URL formats
      let spreadsheetId = '';
      let sheetName = 'Demo_schedule'; // Default sheet name
      
      if (url.includes('/spreadsheets/d/')) {
        // Format: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          spreadsheetId = match[1];
        }
      } else if (url.includes('/spreadsheets/u/')) {
        // Format: https://docs.google.com/spreadsheets/u/0/d/SPREADSHEET_ID/edit#gid=0
        const match = url.match(/\/spreadsheets\/u\/\d+\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          spreadsheetId = match[1];
        }
      }
      
      if (!spreadsheetId) {
        throw new Error('Could not extract spreadsheet ID from URL. Please make sure you copied the full Google Sheets URL.');
      }

      // Extract sheet name from gid if present
      if (url.includes('gid=')) {
        const gidMatch = url.match(/gid=(\d+)/);
        if (gidMatch) {
          const gid = gidMatch[1];
          // For now, keep default sheet name but we could map GID to sheet names later
          console.log('Found GID:', gid);
        }
      }

      // Create CSV export URL for the specific sheet
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`;

      return {
        spreadsheetId,
        sheetName,
        csvUrl
      };
    } catch (error) {
      console.error('Error extracting spreadsheet config:', error);
      throw error;
    }
  };

  const handleExtractAndValidate = async () => {
    setIsValidating(true);
    setValidationError('');
    setValidationSuccess('');

    try {
      if (!sheetUrl.trim()) {
        throw new Error('Please enter a Google Sheets URL');
      }

      console.log('🔍 Extracting configuration from URL:', sheetUrl);
      const config = extractSpreadsheetConfig(sheetUrl);
      
      console.log('📊 Extracted configuration:', config);
      
      // Test if the CSV URL is accessible
      console.log('🧪 Testing CSV accessibility...');
      const response = await fetch(config.csvUrl, { 
        method: 'HEAD',
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error(`CSV export not accessible (${response.status}). Make sure the spreadsheet is shared as "Anyone with the link can view" or is publicly accessible.`);
      }

      setExtractedConfig(config);
      setValidationSuccess('✅ Configuration extracted and validated successfully!');
      
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Failed to extract configuration');
      setExtractedConfig(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleUseConfiguration = () => {
    if (extractedConfig) {
      onSpreadsheetConfigured(extractedConfig);
      setValidationSuccess('Configuration applied! Your Google Sheets integration is now set up.');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`✅ ${label} copied to clipboard!`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="mb-2">On2Cook Google Sheets Setup</h1>
        <p className="text-muted-foreground">
          Configure your "on2cook" spreadsheet with "Demo_schedule" sheet for seamless integration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Setup Instructions
          </CardTitle>
          <CardDescription>
            Follow these steps to connect your On2Cook spreadsheet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium">Step 1: Prepare Your Spreadsheet</h4>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>Open your "on2cook" Google Spreadsheet</li>
              <li>Make sure you have a sheet named <strong>"Demo_schedule"</strong></li>
              <li>Ensure the first row contains these headers in order:
                <div className="mt-2 p-2 bg-white rounded text-xs space-y-1">
                  <div>• <strong>Full name</strong> - Client's name</div>
                  <div>• <strong>Email</strong> - Client's email address</div>
                  <div>• <strong>Phone Number</strong> - Client's phone</div>
                  <div>• <strong>Lead status</strong> - Demo status (Demo Planned, Demo Reschedule, etc.)</div>
                  <div>• <strong>Sales rep</strong> - Sales representative name</div>
                  <div>• <strong>Assignee</strong> - Assigned team member</div>
                  <div>• <strong>Demo date</strong> - Date of demo</div>
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-green-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium">Step 2: Make Spreadsheet Accessible</h4>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>Click the <strong>"Share"</strong> button in your spreadsheet</li>
              <li>Change access to <strong>"Anyone with the link can view"</strong></li>
              <li>Copy the full spreadsheet URL from your browser</li>
              <li>Paste it in the field below</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extract Spreadsheet Configuration</CardTitle>
          <CardDescription>
            Paste your Google Sheets URL to automatically configure the integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheet-url">Google Sheets URL</Label>
            <Input
              id="sheet-url"
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/your-spreadsheet-id/edit#gid=0"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste the full URL from your browser's address bar when viewing your "on2cook" spreadsheet
            </p>
          </div>
          
          <Button 
            onClick={handleExtractAndValidate}
            disabled={isValidating || !sheetUrl.trim()}
            className="w-full"
          >
            {isValidating ? 'Validating...' : 'Extract & Validate Configuration'}
          </Button>
        </CardContent>
      </Card>

      {/* Validation Messages */}
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {validationSuccess && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{validationSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Extracted Configuration */}
      {extractedConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Extracted Configuration
            </CardTitle>
            <CardDescription>
              Review the extracted configuration before applying
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Spreadsheet ID</Label>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm flex-1">{extractedConfig.spreadsheetId}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(extractedConfig.spreadsheetId, 'Spreadsheet ID')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sheet Name</Label>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm flex-1">{extractedConfig.sheetName}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(extractedConfig.sheetName, 'Sheet Name')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">CSV Export URL</Label>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm flex-1 truncate">{extractedConfig.csvUrl}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(extractedConfig.csvUrl, 'CSV URL')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleUseConfiguration}
              className="w-full"
            >
              Use This Configuration
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Additional Help */}
      <Card>
        <CardHeader>
          <CardTitle>Your Current Spreadsheet Format</CardTitle>
          <CardDescription>
            Based on the format you provided, here's how we'll map your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium text-sm mb-2">Expected Column Mapping:</h5>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><strong>Column A:</strong> Full name</div>
              <div><strong>Column B:</strong> Email</div>
              <div><strong>Column C:</strong> Phone Number</div>
              <div><strong>Column D:</strong> Lead status</div>
              <div><strong>Column E:</strong> Sales rep</div>
              <div><strong>Column F:</strong> Assignee</div>
              <div><strong>Column G:</strong> Demo date</div>
            </div>
            <div className="mt-3 p-2 bg-blue-100 rounded text-xs">
              <strong>Note:</strong> The system will also add columns for recipes, notes, and media links during operation.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}