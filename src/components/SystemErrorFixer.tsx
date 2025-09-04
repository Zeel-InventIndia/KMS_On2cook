import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  ExternalLink, 
  Key, 
  Database,
  FileText,
  Upload,
  Settings,
  TestTube,
  Wrench
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SystemErrorFixerProps {
  onClose: () => void;
}

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
  actionable?: boolean;
}

export function SystemErrorFixer({ onClose }: SystemErrorFixerProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [dropboxToken, setDropboxToken] = useState('');
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [fixingDropbox, setFixingDropbox] = useState(false);
  const [fixingSheets, setFixingSheets] = useState(false);

  useEffect(() => {
    runInitialDiagnostics();
  }, []);

  const runInitialDiagnostics = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Test 1: Server Health Check
    try {
      console.log('🏥 Testing server health...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        results.push({
          name: 'Server Health',
          status: 'success',
          message: 'Server is running correctly',
          details: `Environment: ${Object.keys(data.environment || {}).length} variables configured`
        });
      } else {
        results.push({
          name: 'Server Health',
          status: 'error',
          message: `Server health check failed: ${response.status}`,
          actionable: true
        });
      }
    } catch (error) {
      results.push({
        name: 'Server Health',
        status: 'error',
        message: 'Server unreachable',
        details: error instanceof Error ? error.message : 'Unknown error',
        actionable: true
      });
    }

    // Test 2: Google Sheets Access
    try {
      console.log('📊 Testing Google Sheets access...');
      const testUrls = [
        'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455',
        'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/gviz/tq?tqx=out:csv&gid=964863455'
      ];
      
      let sheetsWorking = false;
      let lastError = '';
      
      for (const url of testUrls) {
        try {
          const response = await fetch(url);
          const text = await response.text();
          
          if (response.ok && !text.includes('<!DOCTYPE html>')) {
            sheetsWorking = true;
            break;
          } else if (text.includes('<!DOCTYPE html>')) {
            lastError = 'Google Sheets returned HTML page instead of CSV - likely access denied';
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Network error';
        }
      }
      
      if (sheetsWorking) {
        results.push({
          name: 'Google Sheets Access',
          status: 'success',
          message: 'Google Sheets CSV access working',
        });
      } else {
        results.push({
          name: 'Google Sheets Access',
          status: 'error',
          message: 'Google Sheets access failed',
          details: lastError,
          actionable: true
        });
      }
    } catch (error) {
      results.push({
        name: 'Google Sheets Access',
        status: 'error',
        message: 'Google Sheets test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        actionable: true
      });
    }

    // Test 3: Dropbox Token
    try {
      console.log('📂 Testing Dropbox token...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/self-test`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.dropboxConnected) {
        results.push({
          name: 'Dropbox Access',
          status: 'success',
          message: 'Dropbox token is valid',
          details: `Account: ${data.accountInfo?.name || 'Connected'}`
        });
      } else {
        results.push({
          name: 'Dropbox Access',
          status: 'error',
          message: 'Dropbox token invalid or expired',
          details: data.details || data.error,
          actionable: true
        });
      }
    } catch (error) {
      results.push({
        name: 'Dropbox Access',
        status: 'error',
        message: 'Dropbox test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        actionable: true
      });
    }

    // Test 4: CSV Data Fetch
    try {
      console.log('📋 Testing CSV data fetch...');
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/demo-requests/csv`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        results.push({
          name: 'CSV Data Fetch',
          status: 'success',
          message: `CSV data loaded successfully`,
          details: `${data.demoRequests?.length || 0} demo requests found`
        });
      } else {
        const errorText = await response.text();
        results.push({
          name: 'CSV Data Fetch',
          status: 'error',
          message: 'CSV data fetch failed',
          details: errorText.substring(0, 200) + (errorText.length > 200 ? '...' : ''),
          actionable: true
        });
      }
    } catch (error) {
      results.push({
        name: 'CSV Data Fetch',
        status: 'error',
        message: 'CSV data fetch failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        actionable: true
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  const fixDropboxToken = async () => {
    if (!dropboxToken.trim()) {
      alert('Please enter a Dropbox access token');
      return;
    }

    setFixingDropbox(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/update-token`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: dropboxToken.trim(),
          updatedBy: 'System Error Fixer'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Dropbox token updated successfully! Running diagnostics again...');
        setDropboxToken('');
        await runInitialDiagnostics();
      } else {
        alert(`Failed to update Dropbox token: ${result.details || result.error}`);
      }
    } catch (error) {
      alert(`Error updating Dropbox token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFixingDropbox(false);
    }
  };

  const fixGoogleSheets = async () => {
    if (!googleSheetsUrl.trim()) {
      alert('Please enter a Google Sheets URL');
      return;
    }

    setFixingSheets(true);
    try {
      // Use the server endpoint to test the URL
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/sheets/test-url`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: googleSheetsUrl.trim()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(
          `Google Sheets URL is accessible!\n\n` +
          `Details:\n` +
          `- Response length: ${result.details?.responseLength || 'Unknown'}\n` +
          `- Lines: ${result.details?.lineCount || 'Unknown'}\n` +
          `- Headers: ${result.details?.headerCount || 'Unknown'}\n\n` +
          `Running diagnostics again...`
        );
        setGoogleSheetsUrl('');
        await runInitialDiagnostics();
      } else {
        let errorMsg = `URL test failed: ${result.error}`;
        if (result.suggestion) {
          errorMsg += `\n\nSuggestion: ${result.suggestion}`;
        }
        if (result.details) {
          errorMsg += `\n\nDetails: ${result.details}`;
        }
        alert(errorMsg);
      }
    } catch (error) {
      alert(`Error testing Google Sheets URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFixingSheets(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const hasErrors = testResults.some(r => r.status === 'error');
  const hasDropboxError = testResults.some(r => r.name === 'Dropbox Access' && r.status === 'error');
  const hasSheetsError = testResults.some(r => r.name === 'Google Sheets Access' && r.status === 'error');

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              System Error Fixer
            </CardTitle>
            <CardDescription>
              Diagnose and fix common system issues with Google Sheets access and Dropbox connectivity
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              System Diagnostics
              {isRunning && <RefreshCw className="h-4 w-4 animate-spin" />}
            </CardTitle>
            <CardDescription>
              Automated tests to identify system issues
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{result.name}</h4>
                      <Badge className={`${getStatusColor(result.status)} text-xs`}>
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted p-2 rounded">
                        {result.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {testResults.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  <p>Running diagnostics...</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <Button 
                onClick={runInitialDiagnostics}
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
                Re-run Diagnostics
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Fixes */}
        {hasErrors && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dropbox Fix */}
            {hasDropboxError && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Fix Dropbox Token
                  </CardTitle>
                  <CardDescription>
                    Update the Dropbox access token to restore file upload functionality
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="dropbox-token">New Dropbox Access Token</Label>
                    <Input
                      id="dropbox-token"
                      type="password"
                      value={dropboxToken}
                      onChange={(e) => setDropboxToken(e.target.value)}
                      placeholder="sl.your-dropbox-token-here"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Get a new token from{' '}
                      <a 
                        href="https://www.dropbox.com/developers/apps" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        Dropbox App Console <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                  <Button 
                    onClick={fixDropboxToken}
                    disabled={fixingDropbox || !dropboxToken.trim()}
                    className="w-full"
                  >
                    {fixingDropbox ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Update Dropbox Token
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Google Sheets Fix */}
            {hasSheetsError && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Fix Google Sheets Access
                  </CardTitle>
                  <CardDescription>
                    Test an alternative Google Sheets CSV URL
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="sheets-url">Google Sheets CSV URL</Label>
                    <Textarea
                      id="sheets-url"
                      value={googleSheetsUrl}
                      onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv"
                      className="font-mono text-sm"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Make sure the spreadsheet is shared as "Anyone with the link can view"
                    </p>
                  </div>
                  <Button 
                    onClick={fixGoogleSheets}
                    disabled={fixingSheets || !googleSheetsUrl.trim()}
                    className="w-full"
                  >
                    {fixingSheets ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                    Test Google Sheets URL
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Success Message */}
        {!hasErrors && testResults.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All systems are working correctly! You can return to the application.
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manual Troubleshooting Steps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Google Sheets Issues:</h4>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-4">
                <li>Ensure the spreadsheet is shared as "Anyone with the link can view"</li>
                <li>Check if the sheet exists and the GID in the URL is correct</li>
                <li>Try opening the CSV URL directly in a browser to verify access</li>
                <li>Consider using Google Sheets API with service account for more reliable access</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Dropbox Issues:</h4>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-4">
                <li>Check if the Dropbox app token has expired</li>
                <li>Verify the token has the correct permissions (files.content.write)</li>
                <li>Generate a new token from the Dropbox App Console if needed</li>
                <li>Test the token with a simple API call before updating</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}