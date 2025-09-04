import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  Settings, 
  HelpCircle,
  Wifi,
  Server,
  Key
} from 'lucide-react';

interface UploadErrorHandlerProps {
  error: string;
  onRetry?: () => void;
  onDiagnose?: () => void;
}

export const UploadErrorHandler: React.FC<UploadErrorHandlerProps> = ({
  error,
  onRetry,
  onDiagnose
}) => {
  const getErrorType = (errorMessage: string): 'token' | 'network' | 'server' | 'file' | 'unknown' => {
    const lowercaseError = errorMessage.toLowerCase();
    
    if (lowercaseError.includes('token') || lowercaseError.includes('unauthorized') || lowercaseError.includes('401')) {
      return 'token';
    }
    if (lowercaseError.includes('network') || lowercaseError.includes('fetch') || lowercaseError.includes('cors') || lowercaseError.includes('timeout')) {
      return 'network';
    }
    if (lowercaseError.includes('server') || lowercaseError.includes('500') || lowercaseError.includes('502') || lowercaseError.includes('503')) {
      return 'server';
    }
    if (lowercaseError.includes('file') || lowercaseError.includes('size') || lowercaseError.includes('format')) {
      return 'file';
    }
    return 'unknown';
  };

  const getErrorSuggestions = (errorType: string) => {
    switch (errorType) {
      case 'token':
        return {
          title: 'Authentication Issue',
          icon: <Key className="h-5 w-5 text-yellow-600" />,
          description: 'This appears to be a Dropbox token issue.',
          suggestions: [
            'Verify your Dropbox token is valid and not expired',
            'Check that the token has the correct permissions (files.content.write)',
            'Try generating a new access token from Dropbox App Console',
            'Ensure the token is properly configured in environment variables'
          ],
          quickFix: 'Update your Dropbox token in the upload component'
        };
      
      case 'network':
        return {
          title: 'Network Connectivity Issue',
          icon: <Wifi className="h-5 w-5 text-blue-600" />,
          description: 'Unable to connect to the upload service.',
          suggestions: [
            'Check your internet connection',
            'Verify firewall settings allow connections to Supabase and Dropbox',
            'Try again in a few moments - this may be a temporary network issue',
            'If using VPN, try disconnecting temporarily'
          ],
          quickFix: 'Check your internet connection and try again'
        };
      
      case 'server':
        return {
          title: 'Server Error',
          icon: <Server className="h-5 w-5 text-red-600" />,
          description: 'The upload server encountered an error.',
          suggestions: [
            'This is likely a temporary server issue',
            'Check if the server deployment is complete',
            'Verify environment variables are configured on the server',
            'Try again in a few minutes'
          ],
          quickFix: 'Wait a few minutes and try again'
        };
      
      case 'file':
        return {
          title: 'File Issue',
          icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
          description: 'There was an issue with the selected files.',
          suggestions: [
            'Check that files are not too large (max recommended: 100MB each)',
            'Ensure files are valid image or video formats',
            'Try uploading files one at a time',
            'Remove any special characters from file names'
          ],
          quickFix: 'Try with smaller files or different file formats'
        };
      
      default:
        return {
          title: 'Upload Error',
          icon: <HelpCircle className="h-5 w-5 text-gray-600" />,
          description: 'An unexpected error occurred during upload.',
          suggestions: [
            'Try the upload again',
            'Check your internet connection',
            'Verify the Dropbox token is valid',
            'Run diagnostics to identify the specific issue'
          ],
          quickFix: 'Run diagnostics to identify the problem'
        };
    }
  };

  const errorType = getErrorType(error);
  const suggestions = getErrorSuggestions(errorType);

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Upload Failed:</strong> {error}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {suggestions.icon}
            {suggestions.title}
          </CardTitle>
          <CardDescription>
            {suggestions.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Suggested Solutions:</h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              {suggestions.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <Button onClick={onRetry} size="sm" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            
            {onDiagnose && (
              <Button onClick={onDiagnose} variant="outline" size="sm" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Run Diagnostics
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex items-center gap-2"
            >
              <a href="?diagnose=upload" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open Diagnostics
              </a>
            </Button>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Quick Fix:</strong> {suggestions.quickFix}
            </p>
          </div>

          {errorType === 'token' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h5 className="font-medium text-yellow-800 mb-1">How to Fix Dropbox Token Issues:</h5>
              <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
                <li>Go to <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline">Dropbox App Console</a></li>
                <li>Select your app or create a new one</li>
                <li>Go to the "Settings" tab</li>
                <li>Click "Generate access token"</li>
                <li>Copy the new token and use it in the upload component</li>
              </ol>
            </div>
          )}

          {errorType === 'server' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <h5 className="font-medium text-red-800 mb-1">Server Issues:</h5>
              <p className="text-sm text-red-700">
                If server errors persist, the deployment may be incomplete or environment variables may be missing. 
                Contact your system administrator or check the deployment status.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};