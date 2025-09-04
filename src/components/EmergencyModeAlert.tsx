import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { AlertTriangle, Wrench, RefreshCw, ExternalLink } from 'lucide-react';

interface EmergencyModeAlertProps {
  errorMessage?: string;
  onRetry?: () => void;
  onOpenSystemFixer?: () => void;
  isRetrying?: boolean;
}

export function EmergencyModeAlert({ 
  errorMessage, 
  onRetry, 
  onOpenSystemFixer,
  isRetrying = false 
}: EmergencyModeAlertProps) {
  return (
    <Alert className="border-yellow-200 bg-yellow-50">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-yellow-800 mb-1">System Issues Detected</p>
            <p className="text-sm text-yellow-700">
              {errorMessage || 'Some system components are experiencing issues. The application is running in fallback mode with sample data.'}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry Connection
                  </>
                )}
              </Button>
            )}
            
            {onOpenSystemFixer && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onOpenSystemFixer}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                <Wrench className="h-3 w-3 mr-1" />
                Open System Fixer
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('/?fix=system', '_blank')}
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open Diagnostics
            </Button>
          </div>
          
          <details className="text-xs">
            <summary className="cursor-pointer text-yellow-700 hover:text-yellow-800">
              View troubleshooting tips
            </summary>
            <div className="mt-2 space-y-2 text-yellow-600">
              <div>
                <strong>Google Sheets Issues:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li>Ensure spreadsheet is shared as "Anyone with the link can view"</li>
                  <li>Check if the sheet URL is correct and accessible</li>
                  <li>Try opening the CSV export URL directly in your browser</li>
                </ul>
              </div>
              <div>
                <strong>Dropbox Issues:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li>Dropbox access token may have expired</li>
                  <li>Token may need to be regenerated from Dropbox App Console</li>
                  <li>Check if the app has proper file upload permissions</li>
                </ul>
              </div>
              <div>
                <strong>Network Issues:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li>Check your internet connection</li>
                  <li>Some corporate firewalls may block external API calls</li>
                  <li>Try refreshing the page or clearing browser cache</li>
                </ul>
              </div>
            </div>
          </details>
        </div>
      </AlertDescription>
    </Alert>
  );
}