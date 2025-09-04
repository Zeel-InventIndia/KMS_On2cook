import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  AlertTriangle, 
  ExternalLink, 
  CheckCircle, 
  Share, 
  Eye,
  Users,
  Globe,
  Copy,
  ArrowRight
} from 'lucide-react';

interface GoogleSheetsPermissionGuideProps {
  onClose?: () => void;
  spreadsheetUrl?: string;
}

export function GoogleSheetsPermissionGuide({ 
  onClose, 
  spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/edit?gid=964863455'
}: GoogleSheetsPermissionGuideProps) {
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Header Alert */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Google Sheets Access Issue Detected</strong>
          <br />
          The spreadsheet is not accessible. Please follow the steps below to fix the sharing permissions.
        </AlertDescription>
      </Alert>

      {/* Step-by-step guide */}
      <div className="grid gap-4">
        {/* Step 1 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center p-0">
                1
              </Badge>
              Open the Google Sheets Document
            </CardTitle>
            <CardDescription>
              Access your On2Cook demo schedule spreadsheet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm font-mono break-all">{spreadsheetUrl}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyToClipboard(spreadsheetUrl)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <Button 
              className="w-full" 
              onClick={() => window.open(spreadsheetUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Spreadsheet
            </Button>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center p-0">
                2
              </Badge>
              Click the Share Button
            </CardTitle>
            <CardDescription>
              Look for the blue "Share" button in the top-right corner
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Share className="h-4 w-4 text-blue-600" />
              <span className="text-blue-800">Share</span>
              <ArrowRight className="h-4 w-4 text-blue-600 ml-auto" />
            </div>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center p-0">
                3
              </Badge>
              Change General Access
            </CardTitle>
            <CardDescription>
              Set the document to be viewable by anyone with the link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm">In the share dialog, look for <strong>"General access"</strong> section:</p>
              
              {/* Before/After comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">Current (Wrong)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                    <Users className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-800">Restricted</span>
                  </div>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-700">Required (Correct)</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                    <Globe className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">Anyone with the link</span>
                  </div>
                </div>
              </div>
            </div>

            <Alert>
              <Eye className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Make sure the permission is set to <strong>"Viewer"</strong> not "Editor". 
                This gives read-only access which is all the application needs.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Step 4 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Badge variant="outline" className="w-6 h-6 rounded-full flex items-center justify-center p-0">
                4
              </Badge>
              Save and Test
            </CardTitle>
            <CardDescription>
              Apply the changes and verify the connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm">After changing the permissions:</p>
              <ol className="list-decimal list-inside text-sm space-y-1 ml-4">
                <li>Click <strong>"Done"</strong> to save the sharing settings</li>
                <li>Return to the On2Cook application</li>
                <li>Click <strong>"Retry Connection"</strong> to test the fix</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Troubleshooting */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-800">Still Having Issues?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-amber-700 space-y-2">
            <p><strong>Double-check these common issues:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>The spreadsheet URL is correct and accessible</li>
              <li>You're signed in to the Google account that owns the sheet</li>
              <li>The sharing setting is "Anyone with the link" not "Restricted"</li>
              <li>The permission level is "Viewer" (not "Editor" or "Commenter")</li>
              <li>You've clicked "Done" to save the sharing changes</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      {onClose && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>
            I'll Fix This Later
          </Button>
          <Button onClick={onClose}>
            I've Fixed The Permissions
          </Button>
        </div>
      )}
    </div>
  );
}