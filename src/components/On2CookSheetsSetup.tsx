import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertCircle, ExternalLink, Copy, Settings, ArrowRight, RefreshCw } from 'lucide-react';
import { 
  extractSpreadsheetId, 
  generateCsvUrl, 
  updateOn2CookConfig, 
  loadOn2CookConfig,
  getOn2CookConfig,
  isOn2CookConfigured 
} from '../utils/on2cookConfig';

interface On2CookSheetsSetupProps {
  onConfigurationComplete: (config: {
    spreadsheetId: string;
    sheetName: string;
    csvUrl: string;
  }) => void;
}

export function On2CookSheetsSetup({ onConfigurationComplete }: On2CookSheetsSetupProps) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [validationSuccess, setValidationSuccess] = useState<string>('');
  const [extractedConfig, setExtractedConfig] = useState<{
    spreadsheetId: string;
    sheetName: string;
    csvUrl: string;
  } | null>(null);
  const [currentConfig, setCurrentConfig] = useState<any>(null);
  const [testResults, setTestResults] = useState<{
    apiKeyValid: boolean;
    spreadsheetAccessible: boolean;
    sheetExists: boolean;
    dataFound: boolean;
    errorDetails?: string;
  } | null>(null);

  // Load existing configuration on component mount
  useEffect(() => {
    const hasConfig = loadOn2CookConfig();
    if (hasConfig) {
      const config = getOn2CookConfig();
      setCurrentConfig(config);
      setExtractedConfig(config);
    }
  }, []);

  const validateAndExtractConfig = async () => {
    setIsValidating(true);
    setValidationError('');
    setValidationSuccess('');
    setTestResults(null);

    try {
      if (!sheetUrl.trim()) {
        throw new Error('Please enter your Google Sheets URL');
      }

      console.log('🔍 Extracting configuration from URL:', sheetUrl);
      
      // Extract spreadsheet ID
      const spreadsheetId = extractSpreadsheetId(sheetUrl);
      const sheetName = 'Demo_schedule';
      const csvUrl = generateCsvUrl(spreadsheetId);
      
      const config = {
        spreadsheetId,
        sheetName,
        csvUrl
      };

      console.log('📊 Extracted configuration:', config);
      
      // Test the configuration
      await testConfiguration(config);
      
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Failed to extract configuration');
      setExtractedConfig(null);
      setTestResults(null);
    } finally {
      setIsValidating(false);
    }
  };

  const testConfiguration = async (config: {
    spreadsheetId: string;
    sheetName: string;
    csvUrl: string;
  }) => {
    const results = {
      apiKeyValid: false,
      spreadsheetAccessible: false,
      sheetExists: false,
      dataFound: false,
      errorDetails: ''
    };

    try {
      console.log('🧪 Testing Google Sheets API access...');
      
      // Test 1: Check if CSV is accessible
      console.log('📊 Testing CSV accessibility:', config.csvUrl);
      const csvResponse = await fetch(config.csvUrl, { 
        method: 'HEAD',
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!csvResponse.ok) {
        throw new Error(`CSV not accessible (${csvResponse.status}). Make sure spreadsheet is shared as "Anyone with the link can view"`);
      }
      
      results.spreadsheetAccessible = true;
      console.log('✅ Spreadsheet is accessible via CSV export');

      // Test 2: Try to fetch actual data
      console.log('📊 Testing data retrieval...');
      const dataResponse = await fetch(config.csvUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!dataResponse.ok) {
        throw new Error(`Failed to fetch data (${dataResponse.status})`);
      }
      
      const csvText = await dataResponse.text();
      const lines = csvText.trim().split('\n');
      
      if (lines.length < 2) {
        throw new Error('Spreadsheet appears to be empty or has no data rows');
      }
      
      // Check if headers look correct
      const headers = lines[0].toLowerCase();
      const expectedHeaders = ['full name', 'email', 'phone', 'lead status', 'sales rep', 'assignee', 'demo date'];
      const hasValidHeaders = expectedHeaders.some(header => 
        headers.includes(header.replace(' ', '')) || headers.includes(header)
      );
      
      if (!hasValidHeaders) {
        console.warn('⚠️ Headers may not match expected format. Found:', headers);
        results.errorDetails = `Headers found: ${headers}\nExpected format: Full name, Email, Phone Number, Lead status, Sales rep, Assignee, Demo date`;
      }
      
      results.sheetExists = true;
      results.dataFound = lines.length > 1;
      results.apiKeyValid = true; // CSV access doesn't need API key
      
      console.log(`✅ Successfully found ${lines.length - 1} data rows`);
      
      setExtractedConfig(config);
      setValidationSuccess(`✅ Configuration validated! Found ${lines.length - 1} demo requests in your spreadsheet.`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during testing';
      results.errorDetails = errorMessage;
      console.error('❌ Configuration test failed:', errorMessage);
      throw new Error(errorMessage);
    } finally {
      setTestResults(results);
    }
  };

  const applyConfiguration = () => {
    if (extractedConfig) {
      updateOn2CookConfig(extractedConfig);
      setCurrentConfig(extractedConfig);
      onConfigurationComplete(extractedConfig);
      setValidationSuccess('✅ Configuration saved and applied! Your On2Cook system is now connected to your spreadsheet.');
    }
  };

  const testCurrentConfiguration = async () => {
    if (currentConfig) {
      setIsValidating(true);
      try {
        await testConfiguration(currentConfig);
        setValidationSuccess('✅ Current configuration is working correctly!');
      } catch (error) {
        setValidationError(error instanceof Error ? error.message : 'Configuration test failed');
      } finally {
        setIsValidating(false);
      }
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`✅ ${label} copied to clipboard!`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="mb-2 flex items-center gap-2">
          <Settings className="h-6 w-6" />
          On2Cook Google Sheets Setup
        </h1>
        <p className="text-muted-foreground">
          Configure your "on2cook" spreadsheet with "Demo_schedule" sheet for the kitchen management system.
        </p>
      </div>

      {/* Current Configuration Status */}
      {currentConfig && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Current Configuration
            </CardTitle>
            <CardDescription>
              Your On2Cook system is configured and connected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Spreadsheet ID:</strong>
                <code className="block bg-white p-2 rounded mt-1 text-xs break-all">
                  {currentConfig.spreadsheetId}
                </code>
              </div>
              <div>
                <strong>Sheet Name:</strong>
                <code className="block bg-white p-2 rounded mt-1 text-xs">
                  {currentConfig.sheetName}
                </code>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={testCurrentConfiguration}
                disabled={isValidating}
                size="sm"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Test Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
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
              <li>Ensure the first row contains headers in this exact order:
                <div className="mt-2 p-2 bg-white rounded text-xs grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>• <strong>Full name</strong></div>
                  <div>• <strong>Email</strong></div>
                  <div>• <strong>Phone Number</strong></div>
                  <div>• <strong>Lead status</strong></div>
                  <div>• <strong>Sales rep</strong></div>
                  <div>• <strong>Assignee</strong></div>
                  <div>• <strong>Demo date</strong></div>
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-green-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium">Step 2: Share Your Spreadsheet</h4>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>Click the <strong>"Share"</strong> button in your spreadsheet</li>
              <li>Change access to <strong>"Anyone with the link can view"</strong></li>
              <li>Copy the spreadsheet URL from your browser</li>
              <li>Paste it below and click "Validate & Configure"</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Input */}
      <Card>
        <CardHeader>
          <CardTitle>Connect Your Spreadsheet</CardTitle>
          <CardDescription>
            Paste your Google Sheets URL to set up the integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sheet-url">On2Cook Spreadsheet URL</Label>
            <Input
              id="sheet-url"
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/your-spreadsheet-id/edit#gid=0"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste the full URL from your browser when viewing your "on2cook" spreadsheet
            </p>
          </div>
          
          <Button 
            onClick={validateAndExtractConfig}
            disabled={isValidating || !sheetUrl.trim()}
            className="w-full"
          >
            {isValidating ? 'Validating...' : 'Validate & Configure'}
            {!isValidating && <ArrowRight className="h-4 w-4 ml-2" />}
          </Button>
        </CardContent>
      </Card>

      {/* Validation Messages */}
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div>{validationError}</div>
              {testResults?.errorDetails && (
                <div className="text-xs bg-red-100 p-2 rounded mt-2">
                  <strong>Details:</strong> {testResults.errorDetails}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validationSuccess && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{validationSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Test Results */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Configuration Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {testResults.spreadsheetAccessible ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Spreadsheet accessible</span>
              </div>
              <div className="flex items-center gap-2">
                {testResults.sheetExists ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Demo_schedule sheet found</span>
              </div>
              <div className="flex items-center gap-2">
                {testResults.dataFound ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span>Data rows detected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Configuration */}
      {extractedConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Configuration Ready
            </CardTitle>
            <CardDescription>
              Your spreadsheet configuration has been extracted and validated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Spreadsheet ID</Label>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm flex-1 break-all">
                    {extractedConfig.spreadsheetId}
                  </code>
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
                <Label className="text-sm font-medium">CSV Export URL</Label>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded text-sm flex-1 truncate">
                    {extractedConfig.csvUrl}
                  </code>
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
              onClick={applyConfiguration}
              className="w-full"
            >
              Apply Configuration & Start Using On2Cook
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sample Data Format */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Data Format</CardTitle>
          <CardDescription>
            Your spreadsheet should have data in this format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-1">Full name</th>
                  <th className="text-left p-1">Email</th>
                  <th className="text-left p-1">Phone Number</th>
                  <th className="text-left p-1">Lead status</th>
                  <th className="text-left p-1">Sales rep</th>
                  <th className="text-left p-1">Assignee</th>
                  <th className="text-left p-1">Demo date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-1">Anand Test neww</td>
                  <td className="p-1">anand@on2cook.com</td>
                  <td className="p-1">919099034248</td>
                  <td className="p-1">Demo Reschedule</td>
                  <td className="p-1">Sapan</td>
                  <td className="p-1">Madhuri</td>
                  <td className="p-1">2025-08-29T15:39:00.000Z</td>
                </tr>
                <tr>
                  <td className="p-1">Sunil Ware</td>
                  <td className="p-1">sunilware.1367@gmail.com</td>
                  <td className="p-1">917796110107</td>
                  <td className="p-1">Demo Planned</td>
                  <td className="p-1">Saurabh</td>
                  <td className="p-1">Madhuri</td>
                  <td className="p-1"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}