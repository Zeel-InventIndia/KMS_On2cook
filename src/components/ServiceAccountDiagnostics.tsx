import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Settings,
  Key,
  Shield,
  ExternalLink,
  FileText,
  Zap
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ServiceAccountStatus {
  hasCredentials: boolean;
  jwtWorking: boolean;
  sheetsAccess: boolean;
  specificError?: string;
  recommendations: string[];
}

export function ServiceAccountDiagnostics() {
  const [isLoading, setIsLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [status, setStatus] = useState<ServiceAccountStatus | null>(null);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Running service account diagnostics...');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/debug-service-account-detailed`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Diagnostics failed: ${response.status}`);
      }

      const result = await response.json();
      setDiagnostics(result);
      
      // Analyze results
      const hasCredentials = result.diagnostics?.parsing?.success || false;
      const jwtWorking = result.diagnostics?.authentication?.jwtTest?.success || false;
      const sheetsAccess = result.diagnostics?.sheetTest?.fixed?.result?.success || 
                          result.diagnostics?.sheetTest?.original?.result?.success || false;

      let specificError = '';
      const recommendations = [];

      if (!hasCredentials) {
        specificError = 'Service account JSON parsing failed';
        recommendations.push('Regenerate service account JSON in Google Cloud Console');
        recommendations.push('Ensure JSON is properly formatted and escaped');
      } else if (!jwtWorking) {
        const jwtError = result.diagnostics?.authentication?.jwtError || '';
        if (jwtError.includes('JWT signature')) {
          specificError = 'JWT signature validation failed';
          recommendations.push('Private key format issue - regenerate service account');
          recommendations.push('Ensure private key is in PKCS#8 format');
        } else {
          specificError = 'JWT authentication failed';
          recommendations.push('Check service account permissions');
          recommendations.push('Verify service account has Sheets API access');
        }
      } else if (!sheetsAccess) {
        specificError = 'Google Sheets API access denied';
        recommendations.push('Add service account email as viewer to spreadsheet');
        recommendations.push('Enable Google Sheets API in Google Cloud Console');
      } else {
        recommendations.push('Service account working correctly');
      }

      setStatus({
        hasCredentials,
        jwtWorking,
        sheetsAccess,
        specificError,
        recommendations
      });

    } catch (error) {
      console.error('❌ Diagnostics failed:', error);
      setStatus({
        hasCredentials: false,
        jwtWorking: false,
        sheetsAccess: false,
        specificError: error instanceof Error ? error.message : 'Unknown error',
        recommendations: ['Check server connectivity', 'Verify environment configuration']
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Run diagnostics on component mount
  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusColor = (isWorking: boolean) => {
    return isWorking ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (isWorking: boolean) => {
    return isWorking ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />;
  };

  const openGoogleCloudConsole = () => {
    window.open('https://console.cloud.google.com/apis/credentials', '_blank');
  };

  const openSheetsAPI = () => {
    window.open('https://console.cloud.google.com/apis/library/sheets.googleapis.com', '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Shield className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-2xl font-semibold">Service Account Diagnostics</h1>
            <p className="text-muted-foreground">
              Diagnose and fix Google Sheets service account authentication issues
            </p>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={`border-2 ${status.hasCredentials ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={getStatusColor(status.hasCredentials)}>
                  {getStatusIcon(status.hasCredentials)}
                </div>
                <div>
                  <h3 className="font-medium">Credentials</h3>
                  <p className="text-sm text-muted-foreground">
                    {status.hasCredentials ? 'JSON Valid' : 'JSON Invalid'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 ${status.jwtWorking ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={getStatusColor(status.jwtWorking)}>
                  {getStatusIcon(status.jwtWorking)}
                </div>
                <div>
                  <h3 className="font-medium">JWT Auth</h3>
                  <p className="text-sm text-muted-foreground">
                    {status.jwtWorking ? 'Working' : 'Failed'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 ${status.sheetsAccess ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={getStatusColor(status.sheetsAccess)}>
                  {getStatusIcon(status.sheetsAccess)}
                </div>
                <div>
                  <h3 className="font-medium">Sheets Access</h3>
                  <p className="text-sm text-muted-foreground">
                    {status.sheetsAccess ? 'Connected' : 'Blocked'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Current Issue */}
      {status && status.specificError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div><strong>Current Issue:</strong> {status.specificError}</div>
              <div><strong>Action Required:</strong></div>
              <ul className="list-disc list-inside space-y-1">
                {status.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Fix Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer" onClick={openGoogleCloudConsole}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900">Regenerate Service Account</h3>
                <p className="text-sm text-blue-700">Create new credentials in Google Cloud</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 hover:bg-green-100 transition-colors cursor-pointer" onClick={openSheetsAPI}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 text-white p-2 rounded-lg">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-green-900">Enable Sheets API</h3>
                <p className="text-sm text-green-700">Ensure API is enabled in project</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results */}
      {diagnostics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detailed Diagnostics Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Environment Check */}
              <div>
                <h4 className="font-medium mb-2">Environment Variables</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={diagnostics.diagnostics.environment.hasServiceAccountJson ? "default" : "destructive"}>
                      {diagnostics.diagnostics.environment.hasServiceAccountJson ? "✅" : "❌"}
                    </Badge>
                    <span>Service Account JSON</span>
                  </div>
                  <div className="text-muted-foreground">
                    Length: {diagnostics.diagnostics.environment.jsonLength} chars
                  </div>
                </div>
              </div>

              {/* Parsing Results */}
              {diagnostics.diagnostics.parsing && (
                <div>
                  <h4 className="font-medium mb-2">JSON Parsing</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={diagnostics.diagnostics.parsing.success ? "default" : "destructive"}>
                        {diagnostics.diagnostics.parsing.success ? "✅" : "❌"}
                      </Badge>
                      <span>JSON Format Valid</span>
                    </div>
                    
                    {diagnostics.diagnostics.parsing.error && (
                      <div className="text-red-600 bg-red-50 p-2 rounded">
                        Parse Error: {diagnostics.diagnostics.parsing.error}
                      </div>
                    )}

                    {diagnostics.diagnostics.parsing.hasRequiredFields && (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(diagnostics.diagnostics.parsing.hasRequiredFields).map(([field, present]) => (
                          <div key={field} className="flex items-center gap-2">
                            <Badge variant={present ? "default" : "destructive"} className="text-xs">
                              {present ? "✅" : "❌"}
                            </Badge>
                            <span className="text-xs">{field}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {diagnostics.diagnostics.parsing.privateKeyFormat && (
                      <div className="bg-muted p-2 rounded">
                        <div className="text-xs font-medium mb-1">Private Key Format:</div>
                        <div className="text-xs space-y-1">
                          <div>Has PEM headers: {diagnostics.diagnostics.parsing.privateKeyFormat.hasBeginMarker ? '✅' : '❌'}</div>
                          <div>Has escaped newlines: {diagnostics.diagnostics.parsing.privateKeyFormat.hasEscapedNewlines ? '✅' : '❌'}</div>
                          <div>Length: {diagnostics.diagnostics.parsing.privateKeyFormat.length} chars</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Authentication Test */}
              {diagnostics.diagnostics.authentication && (
                <div>
                  <h4 className="font-medium mb-2">JWT Authentication Test</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={diagnostics.diagnostics.authentication.jwtTest?.success ? "default" : "destructive"}>
                        {diagnostics.diagnostics.authentication.jwtTest?.success ? "✅" : "❌"}
                      </Badge>
                      <span>JWT Creation & Token Exchange</span>
                    </div>
                    
                    {diagnostics.diagnostics.authentication.jwtError && (
                      <div className="text-red-600 bg-red-50 p-2 rounded text-xs">
                        <strong>JWT Error:</strong> {diagnostics.diagnostics.authentication.jwtError}
                      </div>
                    )}

                    {diagnostics.diagnostics.authentication.jwtTest?.details && (
                      <div className="bg-muted p-2 rounded text-xs">
                        <div><strong>JWT Length:</strong> {diagnostics.diagnostics.authentication.jwtTest.details.jwtLength}</div>
                        <div><strong>Token Obtained:</strong> {diagnostics.diagnostics.authentication.jwtTest.details.tokenObtained ? 'Yes' : 'No'}</div>
                        <div><strong>Service Email:</strong> {diagnostics.diagnostics.authentication.jwtTest.details.email}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button 
          onClick={runDiagnostics} 
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Run Diagnostics
            </>
          )}
        </Button>
      </div>

      {/* Help Section */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <Settings className="h-5 w-5" />
            How to Fix Service Account Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            
            <div className="flex gap-3 p-4 bg-white rounded-lg border border-blue-200">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-2">Create New Service Account</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Go to Google Cloud Console and create a fresh service account with proper keys
                </p>
                <Button onClick={openGoogleCloudConsole} variant="outline" size="sm" className="border-blue-300">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Google Cloud Console
                </Button>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-white rounded-lg border border-green-200">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-medium">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-2">Enable Google Sheets API</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Ensure the Google Sheets API is enabled in your Google Cloud project
                </p>
                <Button onClick={openSheetsAPI} variant="outline" size="sm" className="border-green-300">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Enable Sheets API
                </Button>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-white rounded-lg border border-purple-200">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-medium">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-2">Share Spreadsheet with Service Account</h4>
                <div className="text-sm text-muted-foreground mb-3">
                  {diagnostics?.diagnostics?.parsing?.success && diagnostics?.diagnostics?.serviceAccount?.email ? (
                    <>
                      Add this service account email as a viewer to your spreadsheet:
                      <code className="block bg-muted px-2 py-1 rounded mt-1 text-xs break-all">
                        {diagnostics.diagnostics.serviceAccount.email}
                      </code>
                    </>
                  ) : (
                    'Service account email will be shown here once credentials are valid'
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      {diagnostics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Raw Diagnostics Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}