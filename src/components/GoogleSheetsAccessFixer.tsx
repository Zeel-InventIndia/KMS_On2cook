import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink,
  Copy,
  LinkIcon
} from 'lucide-react';
import { ALTERNATIVE_CSV_URLS, HARDCODED_CSV_URL } from '../utils/constants';

interface TestResult {
  url: string;
  status: 'testing' | 'success' | 'error';
  statusCode?: number;
  message?: string;
  preview?: string;
}

export const GoogleSheetsAccessFixer: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [workingUrl, setWorkingUrl] = useState<string | null>(null);

  const testAllUrls = async () => {
    setIsTesting(true);
    setTestResults([]);
    setWorkingUrl(null);

    const urlsToTest = [HARDCODED_CSV_URL, ...ALTERNATIVE_CSV_URLS];
    const results: TestResult[] = urlsToTest.map(url => ({ 
      url, 
      status: 'testing' as const 
    }));
    
    setTestResults(results);

    for (let i = 0; i < urlsToTest.length; i++) {
      const url = urlsToTest[i];
      console.log(`🧪 Testing CSV URL ${i + 1}/${urlsToTest.length}: ${url}`);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/csv,text/plain,application/csv,*/*',
            'User-Agent': 'On2Cook-AccessFixer/1.0'
          },
          mode: 'cors',
          credentials: 'omit',
          signal: AbortSignal.timeout(15000)
        });

        const newResults = [...results];
        
        if (response.ok) {
          const csvText = await response.text();
          const isValidCsv = csvText.length > 50 && csvText.includes(',');
          
          if (isValidCsv) {
            newResults[i] = {
              url,
              status: 'success',
              statusCode: response.status,
              message: 'CSV data accessible',
              preview: csvText.substring(0, 100) + '...'
            };
            
            if (!workingUrl) {
              setWorkingUrl(url);
              console.log('✅ Found working URL:', url);
            }
          } else {
            newResults[i] = {
              url,
              status: 'error',
              statusCode: response.status,
              message: 'Invalid CSV format or empty data'
            };
          }
        } else {
          newResults[i] = {
            url,
            status: 'error',
            statusCode: response.status,
            message: `HTTP ${response.status} ${response.statusText}`
          };
        }

        setTestResults([...newResults]);
        
        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        const newResults = [...results];
        newResults[i] = {
          url,
          status: 'error',
          message: error instanceof Error ? error.message : 'Network error'
        };
        setTestResults([...newResults]);
      }
    }

    setIsTesting(false);
  };

  const testCustomUrl = async () => {
    if (!customUrl.trim() || !customUrl.includes('docs.google.com/spreadsheets')) {
      alert('Please enter a valid Google Sheets URL');
      return;
    }

    const testResult: TestResult = { url: customUrl.trim(), status: 'testing' };
    setTestResults(prev => [...prev, testResult]);

    try {
      const response = await fetch(customUrl.trim(), {
        method: 'GET',
        headers: {
          'Accept': 'text/csv,text/plain,application/csv,*/*',
          'User-Agent': 'On2Cook-AccessFixer/1.0'
        },
        mode: 'cors',
        credentials: 'omit',
        signal: AbortSignal.timeout(15000)
      });

      if (response.ok) {
        const csvText = await response.text();
        const isValidCsv = csvText.length > 50 && csvText.includes(',');
        
        if (isValidCsv) {
          setTestResults(prev => prev.map(r => 
            r.url === customUrl.trim() ? {
              ...r,
              status: 'success',
              statusCode: response.status,
              message: 'CSV data accessible',
              preview: csvText.substring(0, 100) + '...'
            } : r
          ));
          setWorkingUrl(customUrl.trim());
        } else {
          setTestResults(prev => prev.map(r => 
            r.url === customUrl.trim() ? {
              ...r,
              status: 'error',
              statusCode: response.status,
              message: 'Invalid CSV format or empty data'
            } : r
          ));
        }
      } else {
        setTestResults(prev => prev.map(r => 
          r.url === customUrl.trim() ? {
            ...r,
            status: 'error',
            statusCode: response.status,
            message: `HTTP ${response.status} ${response.statusText}`
          } : r
        ));
      }
    } catch (error) {
      setTestResults(prev => prev.map(r => 
        r.url === customUrl.trim() ? {
          ...r,
          status: 'error',
          message: error instanceof Error ? error.message : 'Network error'
        } : r
      ));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard:', text);
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'testing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'testing':
        return <Badge variant="secondary">Testing...</Badge>;
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Google Sheets Access Fixer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div><strong>Common Issue:</strong> Google Sheets access denied or "Page not found"</div>
              <div><strong>Solution:</strong> Test different CSV export formats to find one that works</div>
            </AlertDescription>
          </Alert>

          {/* Test All URLs */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={testAllUrls}
              disabled={isTesting}
              className="flex items-center gap-2"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Testing URLs...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Test All URL Formats
                </>
              )}
            </Button>
            
            {workingUrl && (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Found Working URL!
              </Badge>
            )}
          </div>

          {/* Custom URL Test */}
          <div className="space-y-2">
            <Label>Test Custom URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Paste your Google Sheets CSV URL here..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={testCustomUrl}
                disabled={!customUrl.trim() || isTesting}
              >
                Test
              </Button>
            </div>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Test Results</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testResults.map((result, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(result.status)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono truncate">{result.url}</span>
                        {getStatusBadge(result.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(result.url)}
                          className="ml-auto"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {result.message && (
                        <div className="text-sm text-muted-foreground mb-1">
                          {result.statusCode && `${result.statusCode}: `}{result.message}
                        </div>
                      )}
                      {result.preview && (
                        <div className="text-xs bg-muted p-2 rounded mt-2 font-mono">
                          CSV Preview: {result.preview}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Working URL Instructions */}
          {workingUrl && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <div><strong>Success!</strong> Found a working CSV URL.</div>
                <div className="space-y-2">
                  <div className="font-medium">Working URL:</div>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded">
                    <code className="text-sm flex-1 truncate">{workingUrl}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(workingUrl)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    You can use this URL to update your configuration or share it with your team.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div><strong>If all URLs fail, try these steps:</strong></div>
                <ol className="list-decimal ml-4 space-y-1 text-sm">
                  <li>Open your Google Sheets document</li>
                  <li>Click "Share" in the top-right corner</li>
                  <li>Change access to "Anyone with the link can view"</li>
                  <li>Copy the sharing link</li>
                  <li>Use the sharing link to generate a CSV URL</li>
                </ol>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://support.google.com/docs/answer/183965', '_blank')}
                  className="mt-2"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Google Sheets Sharing Help
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};