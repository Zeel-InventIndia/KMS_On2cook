import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Copy,
  Shield,
  Database,
  Cloud
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  action?: string;
  actionUrl?: string;
}

export function SystemDiagnosticPanel() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [serverLogs, setServerLogs] = useState<string[]>([]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    setServerLogs([]);
    
    const diagnostics: DiagnosticResult[] = [];

    // 1. Check Server Health
    try {
      const healthResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: AbortSignal.timeout(10000)
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        diagnostics.push({
          name: 'Server Health',
          status: 'success',
          message: 'Server is responding normally',
          details: `Dropbox token: ${healthData.environment?.hasDropboxToken ? 'Configured' : 'Missing'}`
        });
      } else {
        diagnostics.push({
          name: 'Server Health',
          status: 'error',
          message: `Server health check failed: ${healthResponse.status}`,
          details: 'The Supabase Edge Function may need to be redeployed'
        });
      }
    } catch (error) {
      diagnostics.push({
        name: 'Server Health',
        status: 'error',
        message: 'Cannot reach server',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // 2. Check Dropbox Endpoints
    try {
      const tokenTestResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/test-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: 'test-token' }),
        signal: AbortSignal.timeout(8000)
      });
      
      if (tokenTestResponse.status === 400) {
        // This is expected for invalid token, but endpoint exists
        diagnostics.push({
          name: 'Dropbox Endpoints',
          status: 'success',
          message: 'Dropbox endpoints are available',
          details: 'Token test endpoint responded correctly'
        });
      } else if (tokenTestResponse.status === 404) {
        diagnostics.push({
          name: 'Dropbox Endpoints',
          status: 'error',
          message: 'Dropbox endpoints not found (404)',
          details: 'Server needs to be redeployed with latest Dropbox integration',
          action: 'Deploy server from local machine',
          actionUrl: 'https://supabase.com/docs/guides/functions'
        });
      } else {
        diagnostics.push({
          name: 'Dropbox Endpoints',
          status: 'warning',
          message: `Unexpected response: ${tokenTestResponse.status}`,
          details: 'Dropbox endpoints may not be working correctly'
        });
      }
    } catch (error) {
      diagnostics.push({
        name: 'Dropbox Endpoints',
        status: 'error',
        message: 'Cannot test Dropbox endpoints',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // 3. Check Google Sheets Access
    const sheetsUrls = [
      'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455',
      'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=0'
    ];

    for (let i = 0; i < sheetsUrls.length; i++) {
      try {
        const sheetsResponse = await fetch(sheetsUrls[i], {
          method: 'HEAD',
          signal: AbortSignal.timeout(8000)
        });
        
        if (sheetsResponse.ok) {
          diagnostics.push({
            name: `Google Sheets Access (Format ${i + 1})`,
            status: 'success',
            message: 'Sheet is accessible',
            details: `URL format ${i + 1} works correctly`
          });
          break; // If one works, we're good
        } else {
          const errorText = await fetch(sheetsUrls[i]).then(r => r.text()).catch(() => 'Unable to read error');
          const isAccessError = errorText.includes('Sorry, unable to open') || 
                               errorText.includes('Page not found') ||
                               sheetsResponse.status === 400 || 
                               sheetsResponse.status === 404;
          
          diagnostics.push({
            name: `Google Sheets Access (Format ${i + 1})`,
            status: 'error',
            message: isAccessError ? 'Access denied' : `HTTP ${sheetsResponse.status}`,
            details: isAccessError ? 'Sheet permissions may need to be updated' : 'Sheet may not exist or have wrong GID',
            action: isAccessError ? 'Fix sharing permissions' : 'Check sheet URL'
          });
        }
      } catch (error) {
        diagnostics.push({
          name: `Google Sheets Access (Format ${i + 1})`,
          status: 'error',
          message: 'Cannot access sheet',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // 4. Check CSV Processing
    try {
      const csvResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/csv/data?demoRequestsCsvUrl=${encodeURIComponent(sheetsUrls[0])}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: AbortSignal.timeout(15000)
      });
      
      if (csvResponse.ok) {
        const csvData = await csvResponse.json();
        diagnostics.push({
          name: 'CSV Processing',
          status: 'success',
          message: 'CSV data processed successfully',
          details: `Loaded ${csvData.data?.demoRequests?.length || 0} demo requests`
        });
      } else {
        const errorData = await csvResponse.text();
        diagnostics.push({
          name: 'CSV Processing',
          status: 'error',
          message: `CSV processing failed: ${csvResponse.status}`,
          details: errorData.substring(0, 200) + (errorData.length > 200 ? '...' : '')
        });
      }
    } catch (error) {
      diagnostics.push({
        name: 'CSV Processing',
        status: 'error',
        message: 'CSV processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setResults(diagnostics);
    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <AlertCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const copyDeployCommand = () => {
    const command = `# Deploy the fixed server to Supabase Edge Functions
npx supabase functions deploy make-server-3005c377 --project-ref ${projectId}

# Or if using the Supabase CLI directly:
supabase functions deploy make-server-3005c377 --project-ref ${projectId}`;
    navigator.clipboard.writeText(command);
  };

  const errorCount = results.filter(r => r.status === 'error').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const successCount = results.filter(r => r.status === 'success').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            System Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={runDiagnostics} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
              {isRunning ? 'Running Diagnostics...' : 'Run System Check'}
            </Button>
            
            {results.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  ✓ {successCount}
                </Badge>
                {warningCount > 0 && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    ⚠ {warningCount}
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    ✗ {errorCount}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Quick Fixes for Common Issues */}
          {errorCount > 0 && (
            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                <strong>Quick Fixes Available:</strong>
                <div className="mt-2 space-y-2 text-sm">
                  <div>• <strong>404 Dropbox errors:</strong> Server needs redeployment with latest fixes</div>
                  <div>• <strong>Google Sheets access:</strong> Check sharing permissions - must be "Anyone with link can view"</div>
                  <div>• <strong>CSV processing:</strong> May be caused by sheet access or server deployment issues</div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Deploy Command Helper */}
          {results.some(r => r.message.includes('404') || r.message.includes('not found')) && (
            <Alert className="border-orange-200 bg-orange-50">
              <Cloud className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-700">
                <strong>Server Deployment Required:</strong>
                <p className="text-sm mt-1">The server needs to be redeployed with the latest Dropbox integration fixes.</p>
                <div className="mt-3 flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyDeployCommand}
                    className="text-orange-700 border-orange-300 hover:bg-orange-100"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Deploy Command
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open('https://supabase.com/docs/guides/functions/deploy', '_blank')}
                    className="text-orange-700 border-orange-300 hover:bg-orange-100"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Deployment Guide
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <Card key={index} className={getStatusColor(result.status)}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{result.name}</h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          result.status === 'success' ? 'border-green-300 text-green-700' :
                          result.status === 'error' ? 'border-red-300 text-red-700' :
                          result.status === 'warning' ? 'border-yellow-300 text-yellow-700' :
                          'border-blue-300 text-blue-700'
                        }`}
                      >
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-gray-600 mt-1">{result.details}</p>
                    )}
                    {result.action && (
                      <div className="mt-2">
                        {result.actionUrl ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.open(result.actionUrl, '_blank')}
                            className="text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {result.action}
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            💡 {result.action}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Google Sheets Permission Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Google Sheets Permission Fix</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>To fix Google Sheets access issues:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Open the Google Sheet: <code className="text-xs bg-gray-100 px-1 rounded">1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM</code></li>
              <li>Click "Share" button (top right)</li>
              <li>Under "General access" select "Anyone with the link"</li>
              <li>Set permission to "Viewer"</li>
              <li>Click "Done" and test again</li>
            </ol>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open('https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM', '_blank')}
            className="text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Open Google Sheet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}