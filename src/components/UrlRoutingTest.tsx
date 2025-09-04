import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { safeFetch } from '../utils/safeHttpResponseHandler';

export const UrlRoutingTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTestingRouting, setIsTestingRouting] = useState(false);

  const testUrls = [
    {
      name: 'Health Check',
      url: `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health`,
      method: 'GET' as const
    },
    {
      name: 'Dropbox Self Test',
      url: `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/self-test`,
      method: 'POST' as const
    },
    {
      name: 'Debug FormData',
      url: `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/debug-formdata`,
      method: 'POST' as const
    },
    {
      name: 'Upload Simple',
      url: `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/upload-simple`,
      method: 'POST' as const
    },
    {
      name: 'Upload Enhanced',
      url: `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/upload-batch-enhanced`,
      method: 'POST' as const
    },
    {
      name: 'Upload Original',
      url: `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/upload-batch`,
      method: 'POST' as const
    }
  ];

  const testUrlRouting = async () => {
    setIsTestingRouting(true);
    setTestResults([]);
    
    const results = [];
    
    for (const testUrl of testUrls) {
      try {
        console.log(`🧪 Testing ${testUrl.name}: ${testUrl.url}`);
        
        const startTime = Date.now();
        let body: FormData | string | undefined;
        
        if (testUrl.method === 'POST') {
          if (testUrl.name.includes('Upload')) {
            // Create a small test FormData for upload endpoints
            body = new FormData();
            body.append('folderPath', '/test');
            body.append('file0', new Blob(['test'], { type: 'text/plain' }), 'test.txt');
          } else {
            body = JSON.stringify({});
          }
        }
        
        const response = await safeFetch(testUrl.url, {
          method: testUrl.method,
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            ...(testUrl.method === 'POST' && !testUrl.name.includes('Upload') ? { 'Content-Type': 'application/json' } : {})
          },
          body,
          signal: AbortSignal.timeout(10000)
        });
        
        const duration = Date.now() - startTime;
        
        // Check if we got redirected to Google Sheets
        const isGoogleSheetsRedirect = (
          response.error?.includes('docs.google.com') ||
          response.error?.includes('Google Sheets') ||
          response.error?.includes('Page not found')
        );
        
        results.push({
          name: testUrl.name,
          url: testUrl.url,
          success: response.success,
          status: response.status,
          error: response.error,
          duration,
          isGoogleSheetsRedirect,
          responseData: response.data ? JSON.stringify(response.data).substring(0, 200) + '...' : null
        });
        
      } catch (error) {
        results.push({
          name: testUrl.name,
          url: testUrl.url,
          success: false,
          status: 0,
          error: error instanceof Error ? error.message : 'Network error',
          duration: 0,
          isGoogleSheetsRedirect: false,
          responseData: null
        });
      }
    }
    
    setTestResults(results);
    setIsTestingRouting(false);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>URL Routing Diagnostic Test</CardTitle>
        <CardDescription>
          Test if Supabase function endpoints are being redirected to Google Sheets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p><strong>Project ID:</strong> {projectId}</p>
            <p><strong>Base URL:</strong> https://{projectId}.supabase.co/functions/v1/make-server-3005c377/</p>
          </div>
          
          <Button 
            onClick={testUrlRouting}
            disabled={isTestingRouting}
            className="w-full"
          >
            {isTestingRouting ? 'Testing URLs...' : 'Test All Endpoints'}
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results:</h3>
            
            {testResults.map((result, index) => (
              <Alert 
                key={index} 
                variant={result.isGoogleSheetsRedirect ? "destructive" : result.success ? "default" : "secondary"}
              >
                {result.isGoogleSheetsRedirect ? (
                  <AlertCircle className="h-4 w-4" />
                ) : result.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <strong>{result.name}</strong>
                      <span className="text-sm">
                        HTTP {result.status} ({result.duration}ms)
                      </span>
                    </div>
                    
                    {result.isGoogleSheetsRedirect && (
                      <div className="text-red-600 font-semibold">
                        🚨 CRITICAL: This endpoint is being redirected to Google Sheets!
                      </div>
                    )}
                    
                    <div className="text-sm font-mono bg-muted p-2 rounded">
                      {result.url}
                    </div>
                    
                    {result.error && (
                      <div className="text-sm text-muted-foreground">
                        Error: {result.error}
                      </div>
                    )}
                    
                    {result.responseData && (
                      <div className="text-sm text-muted-foreground">
                        Response: {result.responseData}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
            
            {/* Summary */}
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <strong>Summary:</strong>
                  <ul className="text-sm space-y-1">
                    <li>✅ Working endpoints: {testResults.filter(r => r.success).length}</li>
                    <li>❌ Failed endpoints: {testResults.filter(r => !r.success && !r.isGoogleSheetsRedirect).length}</li>
                    <li>🚨 Google Sheets redirects: {testResults.filter(r => r.isGoogleSheetsRedirect).length}</li>
                  </ul>
                  
                  {testResults.some(r => r.isGoogleSheetsRedirect) && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-red-800 font-semibold">Critical Issue Detected:</p>
                      <p className="text-red-700 text-sm">
                        Some requests are being redirected to Google Sheets instead of your Supabase functions. 
                        This could be caused by:
                      </p>
                      <ul className="text-red-700 text-sm mt-2 space-y-1">
                        <li>• DNS hijacking or network-level redirects</li>
                        <li>• Browser extensions interfering with requests</li>
                        <li>• Proxy/VPN configuration issues</li>
                        <li>• Incorrect Supabase project configuration</li>
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
};