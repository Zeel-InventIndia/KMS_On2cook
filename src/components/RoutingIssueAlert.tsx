import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

interface RoutingIssueAlertProps {
  errorMessage: string;
}

export const RoutingIssueAlert: React.FC<RoutingIssueAlertProps> = ({ errorMessage }) => {
  const isGoogleSheetsRedirect = errorMessage.includes('Google') || 
                                 errorMessage.includes('docs.google.com') || 
                                 errorMessage.includes('Page not found');

  if (!isGoogleSheetsRedirect) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        <div>
          <p className="font-semibold text-red-800">🚨 Critical Routing Issue Detected!</p>
          <p className="text-red-700 text-sm mt-1">
            Your upload requests are being redirected to Google Sheets instead of the upload server. 
            This prevents file uploads from working.
          </p>
        </div>
        
        <div className="bg-red-50 p-3 rounded border">
          <p className="text-red-800 font-medium text-sm">Possible causes:</p>
          <ul className="text-red-700 text-sm mt-1 space-y-1">
            <li>• Network-level redirects or DNS hijacking</li>
            <li>• Browser extensions interfering with requests</li>
            <li>• VPN/proxy configuration issues</li>
            <li>• Corporate firewall redirects</li>
          </ul>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('?test=routing', '_blank')}
            className="bg-white"
          >
            Run Routing Test
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('?debug=dropbox', '_blank')}
            className="bg-white"
          >
            Full Diagnostics
          </Button>
        </div>
        
        <p className="text-red-600 text-xs">
          The routing test will help identify exactly where the redirect is happening.
        </p>
      </AlertDescription>
    </Alert>
  );
};