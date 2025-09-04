import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { CheckCircle, AlertCircle, Upload, Shield, ExternalLink } from 'lucide-react';

export function ServiceAccountSetup() {
  const [credentials, setCredentials] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ success: boolean; message: string } | null>(null);

  const validateCredentials = () => {
    if (!credentials.trim()) {
      setValidationResult({ success: false, message: 'Please paste your service account credentials JSON' });
      return;
    }

    setIsValidating(true);
    try {
      const parsed = JSON.parse(credentials);
      
      // Validate required fields
      const requiredFields = [
        'type', 'project_id', 'private_key_id', 'private_key',
        'client_email', 'client_id', 'auth_uri', 'token_uri'
      ];
      
      const missingFields = requiredFields.filter(field => !parsed[field]);
      
      if (missingFields.length > 0) {
        setValidationResult({ 
          success: false, 
          message: `Missing required fields: ${missingFields.join(', ')}` 
        });
        return;
      }

      if (parsed.type !== 'service_account') {
        setValidationResult({ 
          success: false, 
          message: 'This appears to be a different type of credential. Please use service account credentials.' 
        });
        return;
      }

      setValidationResult({ 
        success: true, 
        message: `Valid service account credentials for: ${parsed.client_email}` 
      });

    } catch (error) {
      setValidationResult({ 
        success: false, 
        message: 'Invalid JSON format. Please check your credentials file.' 
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCredentials(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Service Account Setup
        </CardTitle>
        <CardDescription>
          Upload your Google Service Account credentials for secure access to private Google Sheets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">Why Service Account?</p>
            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
              <li>✅ No daily renewal required - credentials are long-lived</li>
              <li>✅ Access to private sheets when shared with service account</li>
              <li>✅ Secure server-side authentication</li>
              <li>✅ No user interaction required for authentication</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Step 1: Create Service Account</h4>
            <div className="space-y-2 text-sm">
              <p>1. Go to <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="h-3 w-3" /></a></p>
              <p>2. Create a new service account or select an existing one</p>
              <p>3. Go to the "Keys" tab and create a new JSON key</p>
              <p>4. Download the JSON file</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Step 2: Upload Credentials</h4>
            <div className="space-y-2">
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="credentials-file"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('credentials-file')?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload JSON Credentials File
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">or</div>

              <Textarea
                placeholder="Paste your service account JSON credentials here..."
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={validateCredentials}
              disabled={isValidating || !credentials.trim()}
            >
              {isValidating ? 'Validating...' : 'Validate Credentials'}
            </Button>
          </div>

          {validationResult && (
            <Alert variant={validationResult.success ? "default" : "destructive"}>
              {validationResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{validationResult.message}</AlertDescription>
            </Alert>
          )}

          {validationResult?.success && (
            <Alert>
              <AlertDescription>
                <p className="font-medium mb-2">Next Steps:</p>
                <div className="space-y-1 text-sm">
                  <p>1. Contact your system administrator to set the GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable</p>
                  <p>2. Share your Google Sheets with the service account email shown above</p>
                  <p>3. Give "Editor" permissions if you want to write data back to sheets</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Step 3: Share Your Google Sheets</h4>
          <div className="space-y-2 text-sm">
            <p>After setting up the service account:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Open your Google Sheet</li>
              <li>Click "Share" in the top right</li>
              <li>Add the service account email address</li>
              <li>Grant "Editor" or "Viewer" permissions as needed</li>
              <li>Click "Done"</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}