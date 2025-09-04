import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ExternalLink, AlertTriangle, CheckCircle, Settings, Copy, Shield, Share, Zap } from 'lucide-react';
import { ON2COOK_SPREADSHEET_URL, ON2COOK_SPREADSHEET_ID } from '../utils/constants';
import { GoogleSheetsPermissionGuide } from './GoogleSheetsPermissionGuide';

interface SheetsAccessInstructionsProps {
  onRetry: () => void;
  isRetrying?: boolean;
  errorDetails?: string;
  showFullGuide?: boolean;
}

export function SheetsAccessInstructions({ onRetry, isRetrying, errorDetails, showFullGuide = false }: SheetsAccessInstructionsProps) {
  const [showDetailedGuide, setShowDetailedGuide] = useState(showFullGuide);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const openSpreadsheet = () => {
    window.open(ON2COOK_SPREADSHEET_URL, '_blank');
  };

  const openValidation = () => {
    window.open('?validate=sheets', '_blank');
  };

  const copyToClipboard = async (text: string, type: 'url' | 'id') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Analyze error details to provide specific guidance
  const getErrorAnalysis = () => {
    if (!errorDetails) return null;
    
    const error = errorDetails.toLowerCase();
    
    if (error.includes('400') || error.includes('bad request')) {
      return {
        type: 'access',
        title: 'Access Permission Error (400 Bad Request)',
        description: 'The spreadsheet sharing permissions are not configured correctly.',
        priority: 'high'
      };
    } else if (error.includes('404') || error.includes('not found')) {
      return {
        type: 'notfound',
        title: 'Spreadsheet Not Found (404)',
        description: 'The spreadsheet ID might be incorrect or the spreadsheet has been deleted.',
        priority: 'high'
      };
    } else if (error.includes('403') || error.includes('forbidden')) {
      return {
        type: 'forbidden',
        title: 'Access Forbidden (403)',
        description: 'The spreadsheet exists but access is restricted.',
        priority: 'medium'
      };
    } else if (error.includes('timeout') || error.includes('slow')) {
      return {
        type: 'timeout',
        title: 'Connection Timeout',
        description: 'The Google Sheets server is responding slowly.',
        priority: 'low'
      };
    } else if (error.includes('sorry, unable to open')) {
      return {
        type: 'access',
        title: 'Google Sheets Access Denied',
        description: 'Google Sheets is blocking access due to sharing restrictions.',
        priority: 'high'
      };
    }
    
    return {
      type: 'generic',
      title: 'Connection Issue',
      description: 'There was an issue connecting to the Google Spreadsheet.',
      priority: 'medium'
    };
  };

  const errorAnalysis = getErrorAnalysis();

  // Extract error code for better error categorization
  const getErrorCode = () => {
    if (!errorDetails) return '400';
    const match = errorDetails.match(/\((\d+)\)/);
    return match ? match[1] : errorDetails.includes('400') ? '400' : 'Unknown';
  };

  // If detailed guide is requested, show the comprehensive version
  if (showDetailedGuide) {
    return (
      <GoogleSheetsPermissionGuide 
        onRetry={onRetry}
        isRetrying={isRetrying}
        errorCode={getErrorCode()}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-2xl font-semibold">Google Sheets Access Required</h1>
            <p className="text-muted-foreground">
              Your On2Cook production spreadsheet needs permission updates to work properly
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-3">
          <Badge variant="destructive">Error {getErrorCode()}</Badge>
          <Badge variant="outline">Sharing Permission Issue</Badge>
        </div>
      </div>

      {errorAnalysis && (
        <Alert variant={errorAnalysis.priority === 'high' ? 'destructive' : 'default'} className={
          errorAnalysis.priority === 'high' ? 'border-red-200 bg-red-50' :
          errorAnalysis.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
          'border-blue-200 bg-blue-50'
        }>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div><strong>Detected Issue:</strong> {errorAnalysis.title}</div>
              <div><strong>Description:</strong> {errorAnalysis.description}</div>
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

      {!errorAnalysis && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div><strong>Current Issue:</strong> Cannot access the On2Cook spreadsheet</div>
              <div><strong>Most likely cause:</strong> Spreadsheet sharing permissions are not set correctly</div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Fix Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer" onClick={() => setShowDetailedGuide(true)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900">Step-by-Step Guide</h3>
                <p className="text-sm text-blue-700">Detailed instructions to fix sharing permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 bg-green-50 hover:bg-green-100 transition-colors cursor-pointer" onClick={openSpreadsheet}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 text-white p-2 rounded-lg">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-green-900">Quick Fix</h3>
                <p className="text-sm text-green-700">Open spreadsheet and change sharing now</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <Share className="h-5 w-5" />
            Quick Summary - What You Need To Do
          </CardTitle>
          <CardDescription>
            The essential fix to resolve the 400 error
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            
            <div className="flex gap-3 p-4 bg-white rounded-lg border border-amber-200">
              <div className="flex-shrink-0 w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-medium">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-2">Open Your On2Cook Spreadsheet</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Click the button below to open your production spreadsheet in Google Sheets
                </p>
                <Button onClick={openSpreadsheet} variant="outline" size="sm" className="border-amber-300 hover:bg-amber-50">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Production Spreadsheet
                </Button>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-white rounded-lg border border-red-200">
              <div className="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-medium">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-red-900">
                  <Share className="h-4 w-4" />
                  Fix Sharing Settings (THIS FIXES THE 400 ERROR)
                </h4>
                <div className="text-sm space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="font-medium text-red-800 mb-2">🚨 Critical: Do this exactly:</p>
                    <ol className="list-decimal list-inside space-y-1 text-red-700 font-medium">
                      <li>Click the <span className="bg-blue-100 px-2 py-1 rounded">Share</span> button (top-right)</li>
                      <li>Click <span className="bg-blue-100 px-2 py-1 rounded">"Anyone with the link"</span></li>
                      <li>Select <span className="bg-blue-100 px-2 py-1 rounded">"Viewer"</span> permission</li>
                      <li>Click <span className="bg-blue-100 px-2 py-1 rounded">"Done"</span></li>
                    </ol>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-green-50 border border-green-200 rounded">
                    <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-green-700 text-xs">
                      <strong>Safe:</strong> "Viewer" permissions only allow reading data, not editing.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-white rounded-lg border">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-medium">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-2">Verify the Setup</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Test the connection to make sure everything is working correctly
                </p>
                <div className="flex gap-2">
                  <Button onClick={onRetry} disabled={isRetrying} size="sm">
                    {isRetrying ? 'Testing...' : 'Test Connection'}
                  </Button>
                  <Button onClick={openValidation} variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Advanced Validation
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <strong>Spreadsheet URL:</strong>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => copyToClipboard(ON2COOK_SPREADSHEET_URL, 'url')}
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
                  <div className="flex items-center justify-between mb-2">
                    <strong>Spreadsheet ID:</strong>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyToClipboard(ON2COOK_SPREADSHEET_ID, 'id')}
                      className="h-6 px-2"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {copiedId ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <code className="block bg-muted px-2 py-1 rounded text-xs break-all">
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
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            What This Will Fix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm text-green-700">
            <li>✅ Load demo requests from your Google Sheet</li>
            <li>✅ Real-time synchronization with your data</li>
            <li>✅ Recipe management and updates</li>
            <li>✅ Team scheduling and assignments</li>
            <li>✅ Reporting and analytics</li>
          </ul>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="text-center space-y-4">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">✅ Verification Checklist</h4>
          <div className="text-sm text-green-800 space-y-1">
            <div>✅ Spreadsheet opens when you click the link above</div>
            <div>✅ Sharing is set to "Anyone with the link can view"</div>
            <div>✅ Permission level is "Viewer" (not Editor)</div>
            <div>✅ The "Demo_schedule" sheet tab is visible</div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onRetry} disabled={isRetrying} size="lg" className="sm:w-auto">
            {isRetrying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Testing Connection...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                I've Fixed It - Test Now
              </>
            )}
          </Button>
          <Button onClick={() => setShowDetailedGuide(true)} variant="outline" size="lg" className="sm:w-auto">
            <Settings className="h-4 w-4 mr-2" />
            Need Detailed Help?
          </Button>
          <Button onClick={openValidation} variant="outline" className="sm:w-auto">
            <ExternalLink className="h-4 w-4 mr-2" />
            Run Diagnostics
          </Button>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <p className="text-sm text-yellow-800">
            <strong>Still getting 400 errors?</strong> The sharing setting must be exactly 
            <span className="bg-yellow-100 px-1 rounded mx-1 font-mono">"Anyone with the link can view"</span> 
            for Google Sheets API access to work. This is a Google requirement for programmatic access.
          </p>
        </div>
      </div>
    </div>
  );
}