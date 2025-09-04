import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface DropboxTokenRefreshProps {
  onTokenRefreshed?: () => void;
}

export function DropboxTokenRefresh({ onTokenRefreshed }: DropboxTokenRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTokenRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    setSuccess(false);

    try {
      // In a real implementation, you would need to handle OAuth flow
      // For now, we'll show instructions to the user
      setError('Please obtain a new access token from Dropbox and update your environment variable.');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh token');
    } finally {
      setIsRefreshing(false);
    }
  };

  const openDropboxTokenPage = () => {
    window.open('https://www.dropbox.com/developers/apps', '_blank');
  };

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <AlertCircle className="h-5 w-5" />
          Dropbox Token Expired
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your Dropbox access token has expired. To continue uploading media files, 
            you need to obtain a new access token from Dropbox.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <AlertDescription>
              Token refreshed successfully! You can now upload files.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <h4 className="font-medium text-sm">Steps to get a new token:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Go to your Dropbox App Console (link below)</li>
            <li>Select your app or create a new one</li>
            <li>Go to the "Settings" tab</li>
            <li>Scroll down to "Generated access token"</li>
            <li>Click "Generate" to create a new access token</li>
            <li>Copy the token and update your DROPBOX_ACCESS_TOKEN environment variable</li>
          </ol>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={openDropboxTokenPage}
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open Dropbox Console
          </Button>
          
          <Button
            onClick={handleTokenRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Checking...' : 'Retry'}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <strong>Note:</strong> Make sure to use a long-lived access token or implement proper OAuth refresh flow for production use.
        </div>
      </CardContent>
    </Card>
  );
}