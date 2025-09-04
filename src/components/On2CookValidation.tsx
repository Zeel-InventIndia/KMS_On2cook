import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { ON2COOK_SPREADSHEET_ID, ON2COOK_SHEET_NAME } from '../utils/constants';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ValidationResult {
  spreadsheetAccessible: boolean;
  dataFound: boolean;
  headerFormat: boolean;
  rowCount: number;
  errorDetails?: string;
  sampleData?: any[];
}

export function On2CookValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [autoValidated, setAutoValidated] = useState(false);

  const csvUrl = `https://docs.google.com/spreadsheets/d/${ON2COOK_SPREADSHEET_ID}/export?format=csv&gid=0`;
  const viewUrl = `https://docs.google.com/spreadsheets/d/${ON2COOK_SPREADSHEET_ID}/edit#gid=0`;

  // Auto-validate on component mount
  useEffect(() => {
    if (!autoValidated) {
      validateConnection();
      setAutoValidated(true);
    }
  }, [autoValidated]);

  const validateConnection = async () => {
    setIsValidating(true);
    setValidationResult(null);

    const result: ValidationResult = {
      spreadsheetAccessible: false,
      dataFound: false,
      headerFormat: false,
      rowCount: 0
    };

    try {
      console.log('🧪 Testing On2Cook spreadsheet connection using server validation...');
      
      // Use server-side validation for better error handling
      const serverValidationUrl = `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/validate-spreadsheet?spreadsheetId=${ON2COOK_SPREADSHEET_ID}`;
      
      const serverResponse = await fetch(serverValidationUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(20000)
      });

      if (!serverResponse.ok) {
        throw new Error(`Server validation failed: ${serverResponse.status} ${serverResponse.statusText}`);
      }

      const serverResult = await serverResponse.json();
      console.log('📊 Server validation result:', serverResult);

      if (!serverResult.success) {
        throw new Error(serverResult.error || 'Server validation failed');
      }

      // Use server validation results
      result.spreadsheetAccessible = serverResult.accessible;
      
      if (result.spreadsheetAccessible) {
        console.log(`✅ Server validation successful: ${serverResult.accessibleFormats}/${serverResult.totalFormats} URL formats work`);
        
        // Try to get actual data using the working format
        const workingResult = serverResult.results.find((r: any) => r.accessible);
        if (workingResult) {
          console.log('📊 Testing data retrieval with working URL format...');
          
          try {
            const dataResponse = await fetch(workingResult.url, {
              method: 'GET',
              mode: 'cors',
              credentials: 'omit',
              signal: AbortSignal.timeout(15000)
            });

            if (dataResponse.ok) {
              const csvText = await dataResponse.text();
              const lines = csvText.trim().split('\n').filter(line => line.trim());

              result.rowCount = Math.max(0, lines.length - 1);
              result.dataFound = lines.length > 1;

              // Validate headers
              if (lines.length > 0) {
                const headerLine = lines[0].toLowerCase();
                const expectedHeaders = ['full name', 'email', 'phone', 'lead status', 'sales rep', 'assignee', 'demo date'];
                
                let headerMatches = 0;
                expectedHeaders.forEach(header => {
                  if (headerLine.includes(header.replace(' ', '')) || headerLine.includes(header)) {
                    headerMatches++;
                  }
                });

                result.headerFormat = headerMatches >= 5;
              }

              // Get sample data (first 3 rows)
              if (lines.length > 1) {
                result.sampleData = lines.slice(1, 4).map(line => {
                  const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
                  return {
                    name: columns[0] || '',
                    email: columns[1] || '',
                    phone: columns[2] || '',
                    status: columns[3] || '',
                    salesRep: columns[4] || '',
                    assignee: columns[5] || '',
                    date: columns[6] || ''
                  };
                });
              }

              console.log(`✅ Data validation successful: ${result.rowCount} data rows found`);
            } else {
              console.warn('⚠️ Could not fetch data content, but spreadsheet is accessible');
              result.errorDetails = `Data fetch failed: ${dataResponse.status} ${dataResponse.statusText}`;
            }
          } catch (dataError) {
            console.warn('⚠️ Could not validate data content:', dataError);
            result.errorDetails = dataError instanceof Error ? dataError.message : 'Data validation failed';
          }
        }
      } else {
        throw new Error(serverResult.recommendation || 'Spreadsheet is not accessible');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      result.errorDetails = errorMessage;
      console.error('❌ Validation failed:', errorMessage);
      
      // Provide more specific error messages
      if (errorMessage.includes('Server validation failed') || errorMessage.includes('500')) {
        result.errorDetails = 'Server-side validation failed. Please check that the spreadsheet is shared as "Anyone with the link can view" and try again.';
      } else if (errorMessage.includes('not accessible')) {
        result.errorDetails = 'Spreadsheet is not accessible. Please ensure it is shared as "Anyone with the link can view" in Google Sheets sharing settings.';
      }
    } finally {
      setValidationResult(result);
      setIsValidating(false);
    }
  };

  const getStatusIcon = (isSuccess: boolean) => {
    return isSuccess ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    );
  };

  const openSpreadsheet = () => {
    window.open(viewUrl, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="mb-2 flex items-center gap-2">
          <CheckCircle className="h-6 w-6" />
          On2Cook Spreadsheet Validation
        </h1>
        <p className="text-muted-foreground">
          Validating connection to your production On2Cook spreadsheet with Demo_schedule data
        </p>
      </div>

      {/* Spreadsheet Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Connected Spreadsheet
          </CardTitle>
          <CardDescription>
            Production On2Cook kitchen management spreadsheet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Spreadsheet ID:</strong>
              <code className="block bg-muted px-2 py-1 rounded mt-1 text-xs break-all">
                {ON2COOK_SPREADSHEET_ID}
              </code>
            </div>
            <div>
              <strong>Sheet Name:</strong>
              <code className="block bg-muted px-2 py-1 rounded mt-1 text-xs">
                {ON2COOK_SHEET_NAME}
              </code>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={validateConnection}
              disabled={isValidating}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isValidating ? 'Validating...' : 'Test Connection'}
            </Button>
            <Button
              onClick={openSpreadsheet}
              size="sm"
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Spreadsheet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Validation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {getStatusIcon(validationResult.spreadsheetAccessible)}
                <span>Spreadsheet accessible via CSV export</span>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusIcon(validationResult.dataFound)}
                <span>Data rows found ({validationResult.rowCount} rows)</span>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusIcon(validationResult.headerFormat)}
                <span>Headers match expected format</span>
              </div>

              {validationResult.errorDetails && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Error:</strong> {validationResult.errorDetails}
                  </AlertDescription>
                </Alert>
              )}

              {validationResult.spreadsheetAccessible && validationResult.dataFound && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Sample Data Preview:</h4>
                  <div className="bg-muted p-3 rounded-lg overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-1">Name</th>
                          <th className="text-left p-1">Email</th>
                          <th className="text-left p-1">Status</th>
                          <th className="text-left p-1">Sales Rep</th>
                          <th className="text-left p-1">Assignee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.sampleData?.map((row, index) => (
                          <tr key={index}>
                            <td className="p-1">{row.name || 'N/A'}</td>
                            <td className="p-1">{row.email || 'N/A'}</td>
                            <td className="p-1">{row.status || 'N/A'}</td>
                            <td className="p-1">{row.salesRep || 'N/A'}</td>
                            <td className="p-1">{row.assignee || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {validationResult?.spreadsheetAccessible && validationResult?.dataFound && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>✅ Connection Successful!</strong> Your On2Cook spreadsheet is properly configured and accessible. 
            Found {validationResult.rowCount} demo requests ready for processing.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}