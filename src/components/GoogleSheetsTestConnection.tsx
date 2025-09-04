import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { CheckCircle, AlertTriangle, Wifi, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface GoogleSheetsTestConnectionProps {
  onTestComplete?: (success: boolean) => void;
}

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  details?: any;
}

export function GoogleSheetsTestConnection({ onTestComplete }: GoogleSheetsTestConnectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  const runConnectionTest = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    const results: TestResult[] = [];

    try {
      // Step 1: Check server health and environment
      results.push({ step: '1. Checking server configuration...', success: false, message: 'Testing...' });
      setTestResults([...results]);

      const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        }
      });

      if (!healthResponse.ok) {
        throw new Error(`Server health check failed: ${healthResponse.status}`);
      }

      const healthData = await healthResponse.json();
      
      if (!healthData.environment.hasGoogleSheetsKey) {
        results[0] = {
          step: '1. Server Configuration',
          success: false,
          message: 'Google Sheets API key not found',
          details: 'Please add your Google Sheets API key using the secret management tool above.'
        };
        setTestResults([...results]);
        return;
      }

      results[0] = {
        step: '1. Server Configuration',
        success: true,
        message: `Google Sheets API key configured (${healthData.environment.googleSheetsKeyLength} characters)`,
        details: healthData.environment
      };

      // Step 2: Test Google Sheets API access by fetching sheet data
      results.push({ 
        step: '2. Testing Google Sheets API access...', 
        success: false, 
        message: 'Attempting to fetch sheet data...' 
      });
      setTestResults([...results]);

      // Test multiple CSV URL formats to find the working one
      const spreadsheetId = '1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM';
      const csvFormats = [
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=964863455`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?exportFormat=csv&gid=964863455`,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=964863455`
      ];

      let lastError = null;
      let workingFormat = null;
      
      // Try validation endpoint first
      console.log('🧪 Testing spreadsheet validation endpoint...');
      try {
        const validationResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/validate-spreadsheet?spreadsheetId=${spreadsheetId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          },
          signal: AbortSignal.timeout(10000)
        });

        if (validationResponse.ok) {
          const validationData = await validationResponse.json();
          console.log('📊 Validation result:', validationData);
          
          if (validationData.accessible && validationData.results) {
            const workingResult = validationData.results.find(r => r.accessible);
            if (workingResult) {
              workingFormat = workingResult.url;
              console.log('✅ Found working CSV format:', workingFormat);
            }
          }
        }
      } catch (validationError) {
        console.warn('⚠️ Validation endpoint test failed:', validationError);
      }

      // If validation found a working format, use it; otherwise try the main CSV endpoint
      const testUrl = workingFormat || csvFormats[0];
      console.log('🧪 Testing CSV data fetch with URL:', testUrl);

      try {
        const testResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/csv/data?demoRequestsCsvUrl=${encodeURIComponent(testUrl)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(20000) // 20 second timeout for CSV processing
        });

        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          let parsedError;
          try {
            parsedError = JSON.parse(errorText);
          } catch {
            parsedError = { error: 'Failed to parse response', details: errorText };
          }
          
          // Enhanced error classification
          let errorCategory = 'Unknown error';
          let suggestedAction = 'Check server logs for more details';
          
          if (parsedError.details?.includes('Google Sheets access denied') || 
              parsedError.details?.includes('Sorry, unable to open the file') ||
              parsedError.details?.includes('Page not found')) {
            errorCategory = 'Access Permission Error';
            suggestedAction = 'Ensure spreadsheet is shared as "Anyone with the link can view"';
          } else if (testResponse.status === 400) {
            errorCategory = 'Bad Request Error';
            suggestedAction = 'Check if the spreadsheet ID and format are correct';
          } else if (testResponse.status === 500) {
            errorCategory = 'Server Error';
            suggestedAction = 'Check server logs and try again';
          }
          
          results[1] = {
            step: '2. Google Sheets API Access',
            success: false,
            message: `${errorCategory}: ${parsedError.details || parsedError.error || `HTTP ${testResponse.status}: ${testResponse.statusText}`}`,
            details: {
              category: errorCategory,
              suggestion: suggestedAction,
              status: testResponse.status,
              statusText: testResponse.statusText,
              testedUrl: testUrl,
              responseData: parsedError,
              workingFormatFound: !!workingFormat
            }
          };
        } else {
          const testData = await testResponse.json();
          
          // Check if we got valid data
          const demoRequestsCount = testData.data?.demoRequests?.length || 0;
          const isValidData = testData.success && demoRequestsCount >= 0; // Accept 0 as valid (empty sheet)
          
          results[1] = {
            step: '2. Google Sheets API Access',
            success: isValidData,
            message: isValidData 
              ? `Successfully connected to Google Sheets API (fetched ${demoRequestsCount} demo requests)`
              : 'Connected to API but received invalid data format',
            details: {
              message: 'API connection established',
              dataReceived: {
                demoRequestsCount,
                tasksCount: testData.data?.tasks?.length || 0,
                success: testData.success
              },
              testedUrl: testUrl,
              workingFormatFound: !!workingFormat,
              rawResponse: testData.success ? 'Response OK' : testData
            }
          };
        }
      } catch (fetchError) {
        results[1] = {
          step: '2. Google Sheets API Access',
          success: false,
          message: `Connection failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
          details: {
            category: 'Network/Connection Error',
            suggestion: 'Check internet connection and server availability',
            testedUrl: testUrl,
            error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
          }
        };
      }

      setTestResults([...results]);

      // Step 3: Test service account authentication (if available)
      results.push({ 
        step: '3. Testing service account authentication...', 
        success: false, 
        message: 'Checking service account configuration...' 
      });
      setTestResults([...results]);

      try {
        console.log('🧪 Testing debug endpoint availability...');
        const debugUrl = `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/debug-service-account`;
        
        const serviceAccountTestResponse = await fetch(debugUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          signal: AbortSignal.timeout(10000)
        });

        console.log('🔍 Debug endpoint response:', serviceAccountTestResponse.status, serviceAccountTestResponse.statusText);

        if (serviceAccountTestResponse.ok) {
          const serviceAccountData = await serviceAccountTestResponse.json();
          console.log('🔍 Debug endpoint data:', serviceAccountData);
          
          if (serviceAccountData.debug?.serviceAccount?.isConfigured) {
            results[2] = {
              step: '3. Service Account Authentication',
              success: serviceAccountData.debug?.sheetTest?.result?.success || false,
              message: serviceAccountData.debug?.sheetTest?.result?.success 
                ? `Service account working - fetched ${serviceAccountData.debug.sheetTest.result.rowCount} rows`
                : `Service account configured but test failed: ${serviceAccountData.debug?.sheetTest?.error}`,
              details: {
                email: serviceAccountData.debug?.serviceAccount?.email,
                testResult: serviceAccountData.debug?.sheetTest,
                debugEndpointWorking: true
              }
            };
          } else {
            results[2] = {
              step: '3. Service Account Authentication',
              success: false,
              message: 'Service account not configured - using API key authentication',
              details: {
                serviceAccountConfigured: false,
                debugEndpointWorking: true,
                note: 'Service account provides more reliable authentication for production use'
              }
            };
          }
        } else {
          const errorText = await serviceAccountTestResponse.text().catch(() => 'Could not read error response');
          console.error('🔍 Debug endpoint error:', serviceAccountTestResponse.status, errorText);
          
          results[2] = {
            step: '3. Service Account Authentication',
            success: false,
            message: `Debug endpoint returned ${serviceAccountTestResponse.status}: ${serviceAccountTestResponse.statusText}`,
            details: {
              debugEndpointWorking: false,
              status: serviceAccountTestResponse.status,
              statusText: serviceAccountTestResponse.statusText,
              errorResponse: errorText,
              debugUrl: debugUrl
            }
          };
        }
      } catch (error) {
        results[2] = {
          step: '3. Service Account Authentication',
          success: false,
          message: 'Service account test failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      setTestResults([...results]);

      // Step 4: Direct Google Sheets access test (bypass server)
      results.push({ 
        step: '4. Testing direct Google Sheets access...', 
        success: false, 
        message: 'Attempting direct CSV fetch from browser...' 
      });
      setTestResults([...results]);

      try {
        const directTestUrl = `https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455`;
        console.log('🧪 Testing direct CSV access:', directTestUrl);
        
        const directResponse = await fetch(directTestUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/csv,text/plain,application/csv,*/*',
          },
          mode: 'cors',
          signal: AbortSignal.timeout(10000)
        });

        if (directResponse.ok) {
          const csvText = await directResponse.text();
          const lines = csvText.split('\n').filter(line => line.trim());
          
          results[3] = {
            step: '4. Direct Google Sheets Access',
            success: lines.length > 1,
            message: lines.length > 1 
              ? `Direct access successful (${lines.length} rows including header)`
              : 'Direct access returned empty data',
            details: {
              csvLength: csvText.length,
              rowCount: lines.length,
              firstRow: lines[0] || null,
              accessMethod: 'Direct browser fetch'
            }
          };
        } else {
          results[3] = {
            step: '4. Direct Google Sheets Access',
            success: false,
            message: `Direct access failed: ${directResponse.status} ${directResponse.statusText}`,
            details: {
              status: directResponse.status,
              statusText: directResponse.statusText,
              accessMethod: 'Direct browser fetch'
            }
          };
        }
      } catch (directError) {
        results[3] = {
          step: '4. Direct Google Sheets Access',
          success: false,
          message: `Direct access error: ${directError instanceof Error ? directError.message : 'Unknown error'}`,
          details: {
            error: directError instanceof Error ? directError.message : 'Unknown error',
            accessMethod: 'Direct browser fetch',
            likely_cause: 'CORS restrictions or spreadsheet permissions'
          }
        };
      }

      setTestResults([...results]);

      const allSuccessful = results.every(r => r.success);
      if (onTestComplete) {
        onTestComplete(allSuccessful);
      }

    } catch (error) {
      console.error('Connection test failed:', error);
      const errorResult: TestResult = {
        step: 'Connection Test',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error
      };
      
      if (results.length === 0) {
        setTestResults([errorResult]);
      } else {
        // Update the last step with error
        results[results.length - 1] = {
          ...results[results.length - 1],
          success: false,
          message: errorResult.message,
          details: errorResult.details
        };
        setTestResults([...results]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wifi className="h-4 w-4" />
          Test Connection
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Google Sheets Connection Test
          </DialogTitle>
          <DialogDescription>
            Test the connection to Google Sheets API and verify configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Test Results</h4>
              {testResults.map((result, index) => (
                <Alert 
                  key={index} 
                  variant={result.success ? "default" : "destructive"}
                >
                  {result.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{result.step}</span>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? "PASS" : "FAIL"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm">
                      {result.message}
                    </div>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-muted-foreground">
                          View Details
                        </summary>
                        <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* Instructions */}
          {testResults.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Before testing, ensure you have:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Added your Google Sheets API key to the environment</li>
                    <li>Enabled the Google Sheets API in your Google Cloud Console</li>
                    <li>Given the API key access to your spreadsheet</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Close
            </Button>
            <Button 
              onClick={runConnectionTest}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              {isLoading ? 'Testing...' : 'Run Test'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}