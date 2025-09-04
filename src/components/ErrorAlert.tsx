import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { AlertCircle, ExternalLink, Settings } from 'lucide-react';

interface ErrorAlertProps {
  error: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ErrorAlert({ error, onRetry, isRetrying }: ErrorAlertProps) {
  const isAccessError = error.includes('Google Sheets access') || 
                       error.includes('Dropbox') || 
                       error.includes('Page not found') ||
                       error.includes('Sorry, unable to open');

  const isSystemError = error.includes('invalid_access_token') ||
                       error.includes('401') ||
                       error.includes('403') ||
                       error.includes('400 Bad Request');

  const showSystemFixButton = isAccessError || isSystemError;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-3">
        <div>
          <strong>System Error:</strong> {error}
        </div>
        
        {showSystemFixButton && (
          <div className="flex flex-col gap-2">
            <div className="text-sm">
              This appears to be an authentication or configuration issue. Use the system fixer to diagnose and resolve it:
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/?fix=system', '_blank')}
                className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Settings className="h-3 w-3 mr-1" />
                Fix System Issues
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
              
              {onRetry && (
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={onRetry}
                  disabled={isRetrying}
                >
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </Button>
              )}
            </div>
          </div>
        )}
        
        {!showSystemFixButton && onRetry && (
          <div className="flex gap-2">
            <Button
              variant="outline" 
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}