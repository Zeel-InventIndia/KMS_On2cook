import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink, 
  FileText, 
  Settings,
  HelpCircle,
  Zap
} from 'lucide-react';

export const UploadTroubleshootingGuide: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Upload Troubleshooting Guide</h1>
        <p className="text-muted-foreground">
          Common solutions for "No files were uploaded successfully" errors
        </p>
      </div>

      <Alert>
        <HelpCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Quick Start:</strong> If you're seeing upload errors, start with the diagnostics tool below, 
          then follow the step-by-step solutions based on your specific error.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {/* Quick Diagnostics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Step 1: Run Diagnostics
            </CardTitle>
            <CardDescription>
              Start here to identify the exact cause of upload failures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium">Automated System Check</p>
                <p className="text-sm text-muted-foreground">
                  Tests server health, environment variables, tokens, and connectivity
                </p>
              </div>
              <Button asChild>
                <a href="?diagnose=upload" target="_blank" rel="noopener noreferrer">
                  <Zap className="h-4 w-4 mr-2" />
                  Run Diagnostics
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Common Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Common Issues & Solutions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Dropbox Token Issues */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Most Common</Badge>
                <h3 className="font-medium">Dropbox Token Problems</h3>
              </div>
              <div className="pl-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Symptoms:</strong> "Token is required", "Invalid token", "Unauthorized"
                </p>
                <div className="space-y-1 text-sm">
                  <p><strong>Solution 1:</strong> Get a new Dropbox token</p>
                  <ol className="list-decimal list-inside ml-4 space-y-1 text-muted-foreground">
                    <li>Go to <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Dropbox App Console</a></li>
                    <li>Select your app (or create new one with "Full Dropbox" access)</li>
                    <li>Go to Settings → OAuth 2 → Generate Access Token</li>
                    <li>Copy the token and paste it in the upload component</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Server Issues */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Server</Badge>
                <h3 className="font-medium">Server Not Deployed</h3>
              </div>
              <div className="pl-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Symptoms:</strong> "Server health check failed", "Function not found"
                </p>
                <div className="space-y-1 text-sm">
                  <p><strong>Solution:</strong> Deploy the server code</p>
                  <div className="bg-muted p-3 rounded font-mono text-xs">
                    supabase functions deploy server --project-ref YOUR_PROJECT_REF
                  </div>
                  <p className="text-muted-foreground">Or use the deployment script: <code>./deploy_server.sh</code></p>
                </div>
              </div>
            </div>

            {/* File Size Issues */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Files</Badge>
                <h3 className="font-medium">File Size or Format Issues</h3>
              </div>
              <div className="pl-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Symptoms:</strong> Upload starts but fails, timeout errors
                </p>
                <div className="space-y-1 text-sm">
                  <p><strong>Solutions:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                    <li>Keep files under 100MB each</li>
                    <li>Use common formats: JPG, PNG, MP4, MOV</li>
                    <li>Remove special characters from filenames</li>
                    <li>Upload one file at a time for large files</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Network Issues */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Network</Badge>
                <h3 className="font-medium">Network Connectivity</h3>
              </div>
              <div className="pl-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Symptoms:</strong> "Failed to fetch", "Timeout", "Network error"
                </p>
                <div className="space-y-1 text-sm">
                  <p><strong>Solutions:</strong></p>
                  <ul className="list-disc list-inside ml-4 space-y-1 text-muted-foreground">
                    <li>Check internet connection</li>
                    <li>Disable VPN temporarily</li>
                    <li>Check firewall settings</li>
                    <li>Try from different network/browser</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step by Step */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Step-by-Step Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">1</div>
                <div>
                  <p className="font-medium">Run Diagnostics First</p>
                  <p className="text-sm text-muted-foreground">Use the diagnostics tool to identify specific issues</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">2</div>
                <div>
                  <p className="font-medium">Check Environment Variables</p>
                  <p className="text-sm text-muted-foreground">Ensure DROPBOX_ACCESS_TOKEN is set in Supabase environment</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">3</div>
                <div>
                  <p className="font-medium">Test Token Manually</p>
                  <p className="text-sm text-muted-foreground">Use the token test in the upload component</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">4</div>
                <div>
                  <p className="font-medium">Try Small Test File</p>
                  <p className="text-sm text-muted-foreground">Upload a small (under 1MB) image file first</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">5</div>
                <div>
                  <p className="font-medium">Check Server Logs</p>
                  <p className="text-sm text-muted-foreground">Look at Supabase Edge Function logs for detailed errors</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Useful Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" asChild className="justify-start h-auto p-4">
                <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Dropbox App Console</div>
                    <div className="text-sm text-muted-foreground">Create apps and generate tokens</div>
                  </div>
                </a>
              </Button>

              <Button variant="outline" asChild className="justify-start h-auto p-4">
                <a href="?diagnose=upload" target="_blank" rel="noopener noreferrer">
                  <Settings className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Upload Diagnostics</div>
                    <div className="text-sm text-muted-foreground">Automated system testing</div>
                  </div>
                </a>
              </Button>

              <Button variant="outline" asChild className="justify-start h-auto p-4">
                <a href="?deploy=true" target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Deployment Guide</div>
                    <div className="text-sm text-muted-foreground">Server setup instructions</div>
                  </div>
                </a>
              </Button>

              <Button variant="outline" asChild className="justify-start h-auto p-4">
                <a href="?emergency=true" target="_blank" rel="noopener noreferrer">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Emergency Recovery</div>
                    <div className="text-sm text-muted-foreground">Fix critical system issues</div>
                  </div>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Success Indicators */}
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              What Success Looks Like
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-green-700">
              <p>✅ Diagnostics show all systems operational</p>
              <p>✅ Token test returns valid with account name</p>
              <p>✅ Files upload with progress indicators</p>
              <p>✅ Success message shows "Files uploaded successfully"</p>
              <p>✅ Dropbox folder link opens with uploaded files</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};