import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  ExternalLink, 
  Copy,
  Settings,
  Zap,
  Globe,
  Shield
} from 'lucide-react';
import { ON2COOK_SPREADSHEET_URL, ON2COOK_SPREADSHEET_ID } from '../utils/constants';

interface GoogleSheetsErrorRecoveryProps {
  onRetry: () => void;
  isRetrying?: boolean;
  errorDetails?: string;
}

export function GoogleSheetsErrorRecovery({ onRetry, isRetrying, errorDetails }: GoogleSheetsErrorRecoveryProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [testingUrls, setTestingUrls] = useState(false);
  const [urlTestResults, setUrlTestResults] = useState<Array<{url: string; status: string; error?: string}>>([]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openSpreadsheet = () => {
    window.open(ON2COOK_SPREADSHEET_URL, '_blank');
  };

  // Test multiple Google Sheets URLs to diagnose the specific issue
  const testMultipleUrls = async () => {
    setTestingUrls(true);
    const spreadsheetId = '1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM';
    const testUrls = [
      {
        name: 'Primary CSV Export',
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=964863455`
      },
      {
        name: 'Default Sheet CSV',
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`
      },
      {
        name: 'Query Export',
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=964863455`
      },
      {
        name: 'Simple Export',
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`
      }
    ];

    const results = [];
    
    for (const testUrl of testUrls) {
      try {
        console.log(`🧪 Testing ${testUrl.name}: ${testUrl.url}`);
        const response = await fetch(testUrl.url, {
          method: 'GET',
          signal: AbortSignal.timeout(10000)
        });

        const responseText = await response.text();
        
        if (!response.ok) {
          results.push({
            url: testUrl.name,
            status: `❌ HTTP ${response.status}`,
            error: responseText.substring(0, 100)
          });
        } else if (responseText.includes('<!DOCTYPE html>') || responseText.includes('Page not found')) {
          results.push({
            url: testUrl.name,
            status: '🚫 HTML Error Page',
            error: responseText.includes('Sorry, unable to open') ? 'Access Denied' : 'Page Not Found'
          });
        } else if (responseText.length > 50 && responseText.includes(',')) {
          results.push({
            url: testUrl.name,
            status: '✅ Valid CSV',
            error: `${responseText.length} chars, ${responseText.split('\n').length} rows`
          });
        } else {
          results.push({
            url: testUrl.name,
            status: '⚠️ Invalid CSV',
            error: `Too short (${responseText.length} chars) or no commas`
          });
        }
      } catch (error) {
        results.push({
          url: testUrl.name,
          status: '❌ Network Error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setUrlTestResults(results);
    setTestingUrls(false);
  };

  // Analyze the error to provide specific guidance
  const analyzeError = () => {
    if (!errorDetails) return null;
    
    const error = errorDetails.toLowerCase();
    
    if (error.includes('sorry, unable to open the file')) {
      return {
        type: 'access',
        title: '🔒 Google Sheets Access Denied',
        description: 'The spreadsheet sharing permissions are not configured for public access.',
        action: 'Change sharing to "Anyone with the link can view"',
        severity: 'high'
      };
    } else if (error.includes('page not found')) {
      return {
        type: 'notfound',
        title: '📄 Spreadsheet Not Found',
        description: 'The spreadsheet URL appears to be incorrect or the spreadsheet has been deleted.',
        action: 'Verify the spreadsheet ID and URL',
        severity: 'high'
      };
    } else if (error.includes('400') || error.includes('bad request')) {
      return {
        type: 'permissions',
        title: '🛡️ Permission Error (400)',
        description: 'Google Sheets API cannot access the spreadsheet due to permission restrictions.',
        action: 'Set sharing to public view access',
        severity: 'high'
      };
    } else if (error.includes('all') && error.includes('urls failed')) {
      return {
        type: 'multiple',
        title: '🔄 All URLs Failed',
        description: 'Multiple access attempts failed, indicating a systematic sharing issue.',
        action: 'Fix spreadsheet sharing permissions',
        severity: 'high'
      };
    }
    
    return {
      type: 'generic',
      title: '⚠️ Connection Issue',
      description: 'Unable to connect to Google Sheets.',
      action: 'Check internet connection and sharing settings',
      severity: 'medium'
    };
  };

  const errorAnalysis = analyzeError();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <div>
            <h1 className="text-2xl font-semibold">Google Sheets Access Error</h1>
            <p className="text-muted-foreground">
              Unable to fetch data from your On2Cook spreadsheet
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-3">
          <Badge variant="destructive">Connection Failed</Badge>
          {errorAnalysis && (
            <Badge variant="outline" className={
              errorAnalysis.severity === 'high' ? 'border-red-500 text-red-700' : 'border-yellow-500 text-yellow-700'
            }>
              {errorAnalysis.type.toUpperCase()} Error
            </Badge>
          )}
        </div>
      </div>

      {/* Error Analysis */}
      {errorAnalysis && (
        <Alert variant={errorAnalysis.severity === 'high' ? 'destructive' : 'default'} 
               className={errorAnalysis.severity === 'high' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div><strong>Issue:</strong> {errorAnalysis.title}</div>
              <div><strong>Description:</strong> {errorAnalysis.description}</div>
              <div><strong>Required Action:</strong> {errorAnalysis.action}</div>
              {errorDetails && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium">Technical Details</summary>
                  <code className="block bg-muted px-2 py-1 rounded mt-1 text-xs break-all">
                    {errorDetails}
                  </code>
                </details>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer" onClick={openSpreadsheet}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-600 text-white p-2 rounded-lg">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-red-900">Fix Sharing</h3>
                <p className="text-sm text-red-700">Open & change permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer" onClick={testMultipleUrls}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900">Diagnose URLs</h3>
                <p className="text-sm text-blue-700">Test access methods</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 hover:bg-green-100 transition-colors cursor-pointer" onClick={onRetry}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 text-white p-2 rounded-lg">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-green-900">Retry Now</h3>
                <p className="text-sm text-green-700">Test connection</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* URL Test Results */}
      {urlTestResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>URL Diagnostics Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urlTestResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div>
                    <div className="font-medium">{result.url}</div>
                    <div className="text-sm text-muted-foreground">{result.error}</div>
                  </div>
                  <Badge variant={result.status.includes('✅') ? 'default' : 'destructive'}>
                    {result.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step-by-Step Fix */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <Shield className="h-5 w-5" />
            How to Fix Google Sheets Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            
            <div className="flex gap-3 p-4 bg-white rounded-lg border border-amber-200">
              <div className="flex-shrink-0 w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-medium">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-2">Open Your Spreadsheet</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Click the button below to open your On2Cook spreadsheet in Google Sheets
                </p>
                <Button onClick={openSpreadsheet} variant="outline" size="sm" className="border-amber-300 hover:bg-amber-50">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Spreadsheet
                </Button>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-white rounded-lg border border-red-200">
              <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-medium">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-2 text-red-900">
                  Change Sharing Settings (CRITICAL)
                </h4>
                <div className="text-sm space-y-2">
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="font-medium text-red-800 mb-2">🚨 Do this exactly:</p>
                    <ol className="list-decimal list-inside space-y-1 text-red-700">
                      <li>Click the <span className="bg-blue-100 px-2 py-1 rounded font-mono">Share</span> button (top-right)</li>
                      <li>Click <span className="bg-blue-100 px-2 py-1 rounded font-mono">"Anyone with the link"</span></li>
                      <li>Select <span className="bg-blue-100 px-2 py-1 rounded font-mono">"Viewer"</span> permission</li>
                      <li>Click <span className="bg-blue-100 px-2 py-1 rounded font-mono">"Done"</span></li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-white rounded-lg border">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-medium">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-2">Verify & Test</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Test the connection to ensure everything is working
                </p>
                <div className="flex gap-2">
                  <Button onClick={onRetry} disabled={isRetrying} size="sm">
                    {isRetrying ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                  <Button onClick={testMultipleUrls} disabled={testingUrls} variant="outline" size="sm">
                    {testingUrls ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Settings className="h-4 w-4 mr-2" />
                        Run Diagnostics
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => window.open('?diagnose=service-account', '_blank')} 
                    variant="outline" 
                    size="sm"
                    className="border-purple-300 hover:bg-purple-50"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Service Account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Technical Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <strong>Spreadsheet URL:</strong>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => copyToClipboard(ON2COOK_SPREADSHEET_URL)}
                  className="h-6 px-2"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {copiedUrl ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <code className="block bg-muted px-2 py-1 rounded text-xs break-all">
                {ON2COOK_SPREADSHEET_URL}
              </code>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Spreadsheet ID:</strong>
                <code className="block bg-muted px-2 py-1 rounded mt-1 text-xs break-all">
                  {ON2COOK_SPREADSHEET_ID}
                </code>
              </div>
              <div>
                <strong>Required Sheet:</strong>
                <code className="block bg-muted px-2 py-1 rounded mt-1 text-xs">
                  Demo_schedule
                </code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}