import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  ExternalLink, 
  Share,
  Globe,
  Eye,
  Copy,
  FileText,
  Settings,
  HelpCircle,
  Zap
} from 'lucide-react';
import { GoogleSheetsPermissionGuide } from './GoogleSheetsPermissionGuide';
import { GoogleSheetsTestConnection } from './GoogleSheetsTestConnection';

interface GoogleSheetsTroubleshooterProps {
  onRetry?: () => void;
  isRetrying?: boolean;
  errorDetails?: string;
}

export function GoogleSheetsTroubleshooter({ 
  onRetry, 
  isRetrying = false, 
  errorDetails 
}: GoogleSheetsTroubleshooterProps) {
  const [activeTab, setActiveTab] = useState('quick-fix');

  const getErrorCategory = () => {
    if (!errorDetails) return 'unknown';
    
    if (errorDetails.includes('400') || errorDetails.includes('Bad Request')) {
      return 'permissions';
    } else if (errorDetails.includes('404') || errorDetails.includes('Not Found')) {
      return 'not-found';
    } else if (errorDetails.includes('timeout') || errorDetails.includes('ETIMEDOUT')) {
      return 'timeout';
    } else if (errorDetails.includes('CORS')) {
      return 'cors';
    }
    return 'unknown';
  };

  const errorCategory = getErrorCategory();

  const getQuickFixSteps = () => {
    switch (errorCategory) {
      case 'permissions':
        return [
          {
            title: 'Fix Sharing Permissions',
            description: 'The most common issue - spreadsheet is not shared properly',
            action: 'Open the spreadsheet and set sharing to "Anyone with the link can view"',
            primary: true
          },
          {
            title: 'Verify Spreadsheet ID',
            description: 'Ensure the correct spreadsheet is being accessed',
            action: 'Check that the URL contains the right spreadsheet ID'
          },
          {
            title: 'Clear Browser Cache', 
            description: 'Sometimes cached responses cause issues',
            action: 'Refresh the page or clear browser cache and try again'
          }
        ];
      case 'not-found':
        return [
          {
            title: 'Check Spreadsheet Exists',
            description: 'The spreadsheet may have been deleted or moved',
            action: 'Verify the spreadsheet URL is correct and accessible',
            primary: true
          },
          {
            title: 'Update Spreadsheet ID',
            description: 'You may be using an old or incorrect ID',
            action: 'Get the latest spreadsheet URL from your team'
          }
        ];
      case 'timeout':
        return [
          {
            title: 'Retry Connection',
            description: 'Google Sheets may be temporarily slow',
            action: 'Wait a moment and try the connection again',
            primary: true
          },
          {
            title: 'Check Internet Connection',
            description: 'Verify your network connection is stable',
            action: 'Test other websites to ensure connectivity'
          }
        ];
      default:
        return [
          {
            title: 'Fix Sharing Permissions',
            description: 'The most common cause of connection issues',
            action: 'Set spreadsheet sharing to "Anyone with the link can view"',
            primary: true
          },
          {
            title: 'Retry Connection',
            description: 'Try connecting again after fixing permissions',
            action: 'Use the retry button to test the connection'
          },
          {
            title: 'Run Full Diagnostics',
            description: 'Get detailed information about the connection issue',
            action: 'Use the connection test tab for comprehensive testing'
          }
        ];
    }
  };

  const quickFixSteps = getQuickFixSteps();

  return (
    <div className="space-y-6">
      {/* Error Summary */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <div className="font-medium">Google Sheets Connection Failed</div>
            {errorDetails && (
              <div className="text-sm opacity-90">
                <strong>Error:</strong> {errorDetails}
              </div>
            )}
            <div className="text-sm">
              Follow the troubleshooting steps below to resolve this issue.
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Main Troubleshooter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Google Sheets Troubleshooter
          </CardTitle>
          <CardDescription>
            Diagnose and fix connection issues with your Google Sheets data source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quick-fix" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Fix
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Share className="h-4 w-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="test" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Test Connection
              </TabsTrigger>
            </TabsList>

            {/* Quick Fix Tab */}
            <TabsContent value="quick-fix" className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-medium">Recommended Actions</h3>
                
                {quickFixSteps.map((step, index) => (
                  <Card key={index} className={step.primary ? 'border-blue-200 bg-blue-50' : ''}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Badge 
                          variant={step.primary ? 'default' : 'outline'}
                          className="w-6 h-6 rounded-full flex items-center justify-center p-0 mt-0.5"
                        >
                          {index + 1}
                        </Badge>
                        <div className="flex-1 space-y-1">
                          <div className="font-medium flex items-center gap-2">
                            {step.title}
                            {step.primary && <Badge variant="secondary" className="text-xs">Priority</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {step.description}
                          </div>
                          <div className="text-sm font-medium text-blue-600">
                            {step.action}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Action buttons */}
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={() => setActiveTab('permissions')}
                    variant="outline"
                    className="flex-1"
                  >
                    <Share className="h-4 w-4 mr-2" />
                    Fix Permissions
                  </Button>
                  
                  {onRetry && (
                    <Button 
                      onClick={onRetry}
                      disabled={isRetrying}
                      className="flex-1"
                    >
                      {isRetrying ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Retry Connection
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="space-y-4">
              <GoogleSheetsPermissionGuide />
            </TabsContent>

            {/* Test Connection Tab */}
            <TabsContent value="test" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Connection Diagnostics</h3>
                  <Badge variant="outline">Advanced</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Run comprehensive tests to identify the specific cause of connection issues.
                </p>
              </div>
              
              <GoogleSheetsTestConnection />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Additional Help */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <div className="font-medium text-blue-800">Need More Help?</div>
              <div className="text-sm text-blue-700">
                If these troubleshooting steps don't resolve the issue, the problem may be:
              </div>
              <ul className="list-disc list-inside text-sm text-blue-700 space-y-1 ml-4">
                <li>A temporary Google Sheets service outage</li>
                <li>Network firewall blocking Google Sheets access</li>
                <li>Browser security settings preventing API calls</li>
                <li>The spreadsheet has been permanently deleted</li>
              </ul>
              <div className="text-sm text-blue-700 mt-3">
                The application will continue working with sample data until the connection is restored.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}