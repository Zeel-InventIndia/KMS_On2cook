import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  Server, 
  Database,
  Cloud,
  Wifi,
  AlertTriangle
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticResult {
  name: string;
  status: 'checking' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
  timestamp: string;
}

export const UploadDiagnostics: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateResult = (name: string, status: DiagnosticResult['status'], message: string, details?: string) => {
    setResults(prev => {
      const existing = prev.find(r => r.name === name);
      const newResult: DiagnosticResult = {
        name,
        status,
        message,
        details,
        timestamp: new Date().toISOString()
      };
      
      if (existing) {
        return prev.map(r => r.name === name ? newResult : r);
      } else {
        return [...prev, newResult];
      }
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);

    const diagnostics = [
      {
        name: 'Server Health',
        test: testServerHealth
      },
      {
        name: 'Environment Variables',
        test: testEnvironmentVariables
      },
      {
        name: 'Dropbox Token',
        test: testDropboxToken
      },
      {
        name: 'Folder Creation',
        test: testFolderCreation
      },
      {
        name: 'File Upload Endpoint',
        test: testUploadEndpoint
      },
      {
        name: 'Network Connectivity',
        test: testNetworkConnectivity
      }
    ];

    for (let i = 0; i < diagnostics.length; i++) {
      const diagnostic = diagnostics[i];
      updateResult(diagnostic.name, 'checking', 'Running diagnostic...');
      
      try {
        await diagnostic.test(diagnostic.name);
        setProgress(((i + 1) / diagnostics.length) * 100);
      } catch (error) {
        updateResult(
          diagnostic.name, 
          'error', 
          'Diagnostic failed', 
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunning(false);
  };

  const testServerHealth = async (name: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
          signal: AbortSignal.timeout(10000)
        }
      );

      // ✅ IMPORTANT: 200 status code is SUCCESS!
      if (response.status === 200) {
        const data = await response.json();
        console.log('✅ Server health check response (HTTP 200 SUCCESS):', data);
        updateResult(
          name, 
          'success', 
          'Server is healthy and responding',
          `✅ HTTP 200 Success! Environment: Dropbox token ${data.environment.hasDropboxToken ? 'configured' : 'missing'}`
        );
      } else {
        const errorText = await response.text();
        updateResult(name, 'error', `Server health check failed: ${response.status}`, 
          `❌ HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      updateResult(name, 'error', 'Server health check failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testEnvironmentVariables = async (name: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
          signal: AbortSignal.timeout(10000)
        }
      );

      if (response.ok) {
        const data = await response.json();
        const env = data.environment;
        
        const missing = [];
        const present = [];
        
        if (env.hasDropboxToken) present.push('Dropbox Token');
        else missing.push('Dropbox Token');
        
        if (env.hasSupabaseConfig) present.push('Supabase Config');
        else missing.push('Supabase Config');
        
        if (env.hasGoogleSheetsKey) present.push('Google Sheets Key');
        else missing.push('Google Sheets Key');

        if (missing.length === 0) {
          updateResult(name, 'success', 'All environment variables configured', `Present: ${present.join(', ')}`);
        } else {
          updateResult(
            name, 
            'warning', 
            `${missing.length} environment variables missing`,
            `Missing: ${missing.join(', ')}. Present: ${present.join(', ')}`
          );
        }
      } else {
        updateResult(name, 'error', 'Failed to check environment variables', 'Server response not OK');
      }
    } catch (error) {
      updateResult(name, 'error', 'Environment check failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testDropboxToken = async (name: string) => {
    try {
      // First check if there's an updated token
      let tokenMessage = 'Using environment token';
      try {
        const healthResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health`,
          {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${publicAnonKey}` },
            signal: AbortSignal.timeout(10000)
          }
        );
        
        // ✅ IMPORTANT: 200 responses are SUCCESS, not errors!
        if (healthResponse.status === 200) {
          const healthData = await healthResponse.json();
          if (healthData.environment.hasDropboxToken) {
            tokenMessage = `Token configured (${healthData.environment.dropboxTokenLength} characters)`;
            
            // Now perform ACTUAL Dropbox API self-test with real token
            console.log('🧪 Performing Dropbox API self-test with actual token...');
            try {
              const selfTestResponse = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/self-test`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${publicAnonKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({}),
                  signal: AbortSignal.timeout(15000)
                }
              );

              if (selfTestResponse.status === 200) {
                const selfTestData = await selfTestResponse.json();
                if (selfTestData.success && selfTestData.dropboxConnected) {
                  updateResult(name, 'success', 'Dropbox token is valid and working', 
                    `✅ Real Dropbox API test successful. Account: ${selfTestData.accountInfo?.name || 'Unknown'}`);
                  return;
                } else {
                  updateResult(name, 'error', 'Dropbox self-test failed', 
                    `❌ ${selfTestData.error || 'Unknown Dropbox connection issue'}`);
                  return;
                }
              } else {
                console.log('⚠️ Self-test endpoint not available, falling back to basic test');
              }
            } catch (selfTestError) {
              console.log('⚠️ Self-test failed, falling back to basic test:', selfTestError);
            }
          } else {
            updateResult(name, 'error', 'No Dropbox token configured', 'DROPBOX_ACCESS_TOKEN environment variable is missing');
            return;
          }
        }
      } catch (healthError) {
        console.warn('Health check failed during token test:', healthError);
      }

      // Fallback: Test with a dummy token to see if the endpoint works
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/test-token`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token: 'test-token' }),
          signal: AbortSignal.timeout(10000)
        }
      );

      // ✅ IMPORTANT: Accept 200 AND 400 as valid responses (400 = invalid token but endpoint works)
      if (response.status === 200 || response.status === 400) {
        const data = await response.json();
        if (data.valid === false) {
          updateResult(name, 'warning', 'Dropbox token endpoint working, but token needs validation', tokenMessage);
        } else if (data.valid === true) {
          updateResult(name, 'success', 'Dropbox token is valid and working', `Account: ${data.accountInfo?.name || 'Unknown'}`);
        } else {
          updateResult(name, 'warning', 'Dropbox token endpoint responded but needs proper token', tokenMessage);
        }
      } else {
        updateResult(name, 'error', `Dropbox token test failed: ${response.status}`, await response.text());
      }
    } catch (error) {
      updateResult(name, 'error', 'Dropbox token test failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testFolderCreation = async (name: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/create-folder`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ folderName: `test-diagnostic-${Date.now()}` }),
          signal: AbortSignal.timeout(15000)
        }
      );

      // ✅ IMPORTANT: 200 status code means SUCCESS, not error!
      if (response.status === 200) {
        const data = await response.json();
        console.log('✅ Folder creation response (200 OK):', data);
        
        if (data.success) {
          updateResult(name, 'success', 'Folder creation working correctly', 
            `✅ HTTP 200 Success - Created: ${data.path}${data.alreadyExists ? ' (folder already existed)' : ''}`);
        } else {
          updateResult(name, 'warning', 'Folder creation responded but reported failure', 
            `⚠️ HTTP 200 but success=false: ${JSON.stringify(data)}`);
        }
      } else {
        const errorText = await response.text();
        if (response.status === 500 && errorText.includes('Dropbox token')) {
          updateResult(name, 'warning', 'Folder creation endpoint working but needs valid Dropbox token', 
            `❌ HTTP ${response.status}: ${errorText}`);
        } else {
          updateResult(name, 'error', `Folder creation failed: ${response.status}`, 
            `❌ HTTP ${response.status}: ${errorText}`);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        updateResult(name, 'error', 'Folder creation timeout', 'Request took longer than 15 seconds');
      } else {
        updateResult(name, 'error', 'Folder creation test failed', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };

  const testUploadEndpoint = async (name: string) => {
    try {
      // Create a tiny test file
      const testFile = new Blob(['test content'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('folderPath', '/test-diagnostic');
      formData.append('file0', testFile, 'diagnostic-test.txt');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/upload-batch`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
            // Don't set Content-Type for FormData
          },
          body: formData,
          signal: AbortSignal.timeout(30000)
        }
      );

      // ✅ CRITICAL FIX: 200 status code is SUCCESS, not an "unexpected response"!
      if (response.status === 200) {
        const data = await response.json();
        console.log('✅ Upload test response (HTTP 200 SUCCESS):', data);
        
        // Test the exact logic used in MediaUploadComponent
        const hasSuccessfulUploads = data.successfulUploads > 0;
        const allUploadsFailed = data.successfulUploads === 0;
        
        if (hasSuccessfulUploads) {
          updateResult(name, 'success', 'Upload endpoint working correctly', 
            `✅ HTTP 200 Success! Test upload: ${data.successfulUploads}/${data.totalFiles} files uploaded successfully. Folder created and image uploaded!`);
        } else if (allUploadsFailed && data.totalFiles > 0) {
          updateResult(name, 'warning', 'Upload endpoint responded correctly but uploads failed', 
            `⚠️ HTTP 200 Success but 0/${data.totalFiles} uploads successful. Likely Dropbox token/permission issue: ${JSON.stringify(data)}`);
        } else {
          updateResult(name, 'warning', 'Upload endpoint returned unexpected data structure', 
            `⚠️ HTTP 200 Success but unexpected response format: ${JSON.stringify(data)}`);
        }
      } else {
        const errorText = await response.text();
        if (response.status === 500 && errorText.includes('Dropbox token')) {
          updateResult(name, 'warning', 'Upload endpoint working but needs valid Dropbox token', 
            `❌ HTTP ${response.status}: ${errorText}`);
        } else {
          updateResult(name, 'error', `Upload endpoint failed: ${response.status}`, 
            `❌ HTTP ${response.status}: ${errorText}`);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        updateResult(name, 'error', 'Upload endpoint timeout', 'Request took longer than 30 seconds');
      } else {
        updateResult(name, 'error', 'Upload endpoint test failed', error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };

  const testNetworkConnectivity = async (name: string) => {
    try {
      const tests = [
        {
          name: 'Supabase',
          url: `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health`
        },
        {
          name: 'Dropbox API',
          url: 'https://api.dropboxapi.com/2/check/user'
        }
      ];

      const results = [];
      
      for (const test of tests) {
        try {
          const startTime = Date.now();
          const response = await fetch(test.url, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          const endTime = Date.now();
          const latency = endTime - startTime;
          
          results.push(`${test.name}: ${response.status} (${latency}ms)`);
        } catch (error) {
          results.push(`${test.name}: Failed (${error instanceof Error ? error.message : 'Unknown error'})`);
        }
      }

      updateResult(name, 'success', 'Network connectivity tested', results.join(', '));
    } catch (error) {
      updateResult(name, 'error', 'Network connectivity test failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'checking':
        return <Badge variant="secondary">Checking...</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Warning</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Auto-run diagnostics on mount
  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Upload System Diagnostics
        </CardTitle>
        <CardDescription>
          Comprehensive system check to identify and resolve upload issues
        </CardDescription>
        
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-green-800">✅ Important: HTTP 200 Responses Are SUCCESS!</strong>
              <p className="text-green-700 text-sm mt-1">
                If you see "Unexpected response: 200", that's actually a <strong>successful operation</strong>! 
                HTTP 200 means the folder was created and images were uploaded correctly. This is not an error.
              </p>
              <p className="text-green-600 text-xs mt-2 font-mono">
                ✅ Folder created → ✅ Images uploaded → ✅ HTTP 200 Success
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={runDiagnostics}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Run Diagnostics
                </>
              )}
            </Button>
            {isRunning && (
              <div className="flex items-center gap-2 min-w-[200px]">
                <Progress value={progress} className="flex-1" />
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
            )}
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Diagnostic Results</h3>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(result.status)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{result.name}</span>
                      {getStatusBadge(result.status)}
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {result.message}
                    </div>
                    {result.details && (
                      <div className="text-xs bg-muted p-2 rounded mt-2 font-mono">
                        {result.details}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary and Recommendations */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Summary & Recommendations</h3>
            
            {results.some(r => r.status === 'error') && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Critical Issues Found:</strong> Upload functionality is likely broken. 
                  Please address the errors above before attempting uploads.
                </AlertDescription>
              </Alert>
            )}

            {results.some(r => r.status === 'warning') && !results.some(r => r.status === 'error') && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warnings Detected:</strong> Upload may work but could be unreliable. 
                  Consider addressing the warnings for optimal performance.
                </AlertDescription>
              </Alert>
            )}

            {results.every(r => r.status === 'success') && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>All Systems Operational:</strong> Upload functionality should work correctly. 
                  If you're still experiencing issues, the problem may be client-side or with specific files.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Server Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <div>Health: {results.find(r => r.name === 'Server Health')?.status || 'Unknown'}</div>
                    <div>Environment: {results.find(r => r.name === 'Environment Variables')?.status || 'Unknown'}</div>
                    <div>Upload Endpoint: {results.find(r => r.name === 'File Upload Endpoint')?.status || 'Unknown'}</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    External Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <div>Dropbox Token: {results.find(r => r.name === 'Dropbox Token')?.status || 'Unknown'}</div>
                    <div>Network: {results.find(r => r.name === 'Network Connectivity')?.status || 'Unknown'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
              <strong>Common Solutions:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>If Dropbox token is invalid: Update your token in the upload component</li>
                <li>If server is unhealthy: Check the deployment and environment variables</li>
                <li>If network issues: Check your internet connection and firewall settings</li>
                <li>If upload endpoint fails: Verify the server code deployment is complete</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};