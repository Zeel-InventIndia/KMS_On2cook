import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  Copy,
  Shield,
  Database,
  Cloud,
  Wrench,
  Eye,
  EyeOff
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ErrorRecoveryPanelProps {
  onClose?: () => void;
}

interface TestResult {
  component: string;
  status: 'success' | 'error' | 'warning' | 'testing';
  message: string;
  details?: string;
  suggestedFix?: string;
  testTime?: string;
}

export function ErrorRecoveryPanel({ onClose }: ErrorRecoveryPanelProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);
  const [manualFixMode, setManualFixMode] = useState(false);

  const runComprehensiveTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);
    
    const results: TestResult[] = [];
    const addResult = (result: TestResult) => {
      results.push({ ...result, testTime: new Date().toLocaleTimeString() });
      setTestResults([...results]);
    };

    // Test 1: Server Health
    addResult({ component: 'Server Health', status: 'testing', message: 'Checking server availability...' });
    try {
      const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: AbortSignal.timeout(10000)
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        addResult({
          component: 'Server Health',
          status: 'success',
          message: 'Server is responding',
          details: `Token configured: ${healthData.environment?.hasDropboxToken ? 'Yes' : 'No'}`
        });
      } else {
        addResult({
          component: 'Server Health',
          status: 'error',
          message: `Server error: ${healthResponse.status}`,
          suggestedFix: 'Server may need redeployment'
        });
      }
    } catch (error) {
      addResult({
        component: 'Server Health',
        status: 'error',
        message: 'Cannot reach server',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestedFix: 'Check internet connection or server deployment'
      });
    }

    // Test 2: Dropbox Endpoints
    addResult({ component: 'Dropbox Endpoints', status: 'testing', message: 'Testing Dropbox integration...' });
    try {
      const dropboxTestResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/test-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: 'test-invalid-token' }),
        signal: AbortSignal.timeout(8000)
      });
      
      if (dropboxTestResponse.status === 400) {
        // Expected response for invalid token
        addResult({
          component: 'Dropbox Endpoints',
          status: 'success',
          message: 'Dropbox endpoints are working',
          details: 'Server can validate tokens'
        });
      } else if (dropboxTestResponse.status === 404) {
        addResult({
          component: 'Dropbox Endpoints',
          status: 'error',
          message: 'Dropbox endpoints missing (404)',
          suggestedFix: 'Server needs redeployment with latest code'
        });
      } else {
        addResult({
          component: 'Dropbox Endpoints',
          status: 'warning',
          message: `Unexpected response: ${dropboxTestResponse.status}`,
          details: 'Endpoints may have issues'
        });
      }
    } catch (error) {
      addResult({
        component: 'Dropbox Endpoints',
        status: 'error',
        message: 'Cannot test Dropbox endpoints',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestedFix: 'Check server deployment status'
      });
    }

    // Test 3: Google Sheets Access
    addResult({ component: 'Google Sheets Access', status: 'testing', message: 'Testing Google Sheets access...' });
    try {
      const testUrls = [
        'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455',
        'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=0'
      ];
      
      let accessWorking = false;
      for (const url of testUrls) {
        try {
          const sheetsResponse = await fetch(url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(8000)
          });
          
          if (sheetsResponse.ok) {
            addResult({
              component: 'Google Sheets Access',
              status: 'success',
              message: 'Google Sheets accessible',
              details: 'Permissions are correctly configured'
            });
            accessWorking = true;
            break;
          }
        } catch (urlError) {
          console.log(`Failed to test URL: ${url}`, urlError);
        }
      }
      
      if (!accessWorking) {
        addResult({
          component: 'Google Sheets Access',
          status: 'error',
          message: 'Google Sheets access denied',
          suggestedFix: 'Update sharing permissions to "Anyone with link can view"'
        });
      }
    } catch (error) {
      addResult({
        component: 'Google Sheets Access',
        status: 'error',
        message: 'Cannot test Google Sheets',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestedFix: 'Check Google Sheets URL and permissions'
      });
    }

    // Test 4: CSV Processing
    addResult({ component: 'CSV Processing', status: 'testing', message: 'Testing CSV data processing...' });
    try {
      const csvResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/csv/data?demoRequestsCsvUrl=${encodeURIComponent('https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455')}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: AbortSignal.timeout(15000)
      });
      
      if (csvResponse.ok) {
        const csvData = await csvResponse.json();
        addResult({
          component: 'CSV Processing',
          status: 'success',
          message: 'CSV processing working',
          details: `Loaded ${csvData.data?.demoRequests?.length || 0} records`
        });
      } else {
        const errorText = await csvResponse.text().catch(() => 'Unable to read error');
        addResult({
          component: 'CSV Processing',
          status: 'error',
          message: `CSV processing failed: ${csvResponse.status}`,
          details: errorText.substring(0, 100) + '...',
          suggestedFix: 'Check Google Sheets access and server deployment'
        });
      }
    } catch (error) {
      addResult({
        component: 'CSV Processing',
        status: 'error',
        message: 'CSV processing test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestedFix: 'Check server status and Google Sheets access'
      });
    }

    setIsRunningTests(false);
  };

  const handleTokenUpdate = async () => {
    if (!newToken.trim()) {
      alert('Please enter a Dropbox token');
      return;
    }

    setIsUpdatingToken(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/update-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          token: newToken.trim(),
          updatedBy: 'Emergency Recovery' 
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok) {
        const result = await response.json();
        alert('Token updated successfully!');
        setNewToken('');
        // Re-run tests to verify
        await runComprehensiveTests();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Token update failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`Token update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingToken(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'testing': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'testing': return 'border-blue-200 bg-blue-50';
    }
  };

  const errorCount = testResults.filter(r => r.status === 'error').length;
  const hasServerIssues = testResults.some(r => 
    r.component === 'Server Health' && r.status === 'error'
  );
  const hasDropboxIssues = testResults.some(r => 
    r.component === 'Dropbox Endpoints' && r.status === 'error'
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-red-600" />
              Emergency Error Recovery
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ✕
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <strong>System Issues Detected:</strong> Multiple errors are preventing normal operation. 
              This panel will help diagnose and fix the problems.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-4">
            <Button 
              onClick={runComprehensiveTests} 
              disabled={isRunningTests}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRunningTests ? 'animate-spin' : ''}`} />
              {isRunningTests ? 'Running Diagnostics...' : 'Run Full System Test'}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setManualFixMode(!manualFixMode)}
              className="flex items-center gap-2"
            >
              <Wrench className="h-4 w-4" />
              Manual Fixes
            </Button>
            
            {testResults.length > 0 && (
              <div className="flex items-center gap-2">
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    {errorCount} Errors
                  </Badge>
                )}
                {errorCount === 0 && testResults.length > 0 && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    All Tests Passed
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Manual Fix Panel */}
          {manualFixMode && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-sm text-blue-800">Manual Token Update</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="emergency-token">Dropbox Access Token</Label>
                  <div className="relative mt-1">
                    <Input
                      id="emergency-token"
                      type={showToken ? 'text' : 'password'}
                      value={newToken}
                      onChange={(e) => setNewToken(e.target.value)}
                      placeholder="Enter your Dropbox access token..."
                      className="pr-10"
                      disabled={isUpdatingToken}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowToken(!showToken)}
                      disabled={isUpdatingToken}
                    >
                      {showToken ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button 
                  onClick={handleTokenUpdate}
                  disabled={!newToken.trim() || isUpdatingToken}
                  className="w-full"
                >
                  {isUpdatingToken ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating Token...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Update Dropbox Token
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Diagnostic Results</h4>
              {testResults.map((result, index) => (
                <Card key={index} className={getStatusColor(result.status)}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-sm">{result.component}</h5>
                          {result.testTime && (
                            <span className="text-xs text-gray-500">{result.testTime}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{result.message}</p>
                        {result.details && (
                          <p className="text-xs text-gray-600 mt-1">{result.details}</p>
                        )}
                        {result.suggestedFix && (
                          <div className="mt-2">
                            <Badge variant="secondary" className="text-xs">
                              💡 {result.suggestedFix}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Emergency Actions */}
          {errorCount > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <Cloud className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700">
                <strong>Emergency Actions Available:</strong>
                <div className="mt-2 space-y-2 text-sm">
                  {hasServerIssues && (
                    <div>• Server deployment required - contact technical team</div>
                  )}
                  {hasDropboxIssues && (
                    <div>• Use "Manual Fixes" to update Dropbox token</div>
                  )}
                  <div>• Check Google Sheets permissions (must be "Anyone with link")</div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open('https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM', '_blank')}
                    className="text-orange-700 border-orange-300 hover:bg-orange-100"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open Google Sheet
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open('https://www.dropbox.com/developers/apps', '_blank')}
                    className="text-orange-700 border-orange-300 hover:bg-orange-100"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Get Dropbox Token
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}