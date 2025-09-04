import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  CheckCircle, 
  AlertCircle, 
  Terminal, 
  Upload, 
  Settings, 
  TestTube,
  Copy,
  ExternalLink
} from 'lucide-react';

export const ServerDeploymentInstructions: React.FC = () => {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const commands = {
    deploy: 'supabase functions deploy server --project-ref YOUR_PROJECT_REF',
    makeExecutable: 'chmod +x deploy_server.sh && chmod +x test_endpoints.sh',
    runDeploy: './deploy_server.sh',
    runTest: './test_endpoints.sh'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Server Deployment Guide
          </CardTitle>
          <CardDescription>
            Deploy the updated server code to fix Dropbox endpoints and improve functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Deployment Required</p>
              <p className="text-sm text-amber-700">
                Your server code needs to be updated to fix the "Unexpected response: 200" errors
                and improve Dropbox API integration.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Step 1: Prerequisites
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Supabase CLI installed and authenticated</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Project linked to Supabase</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Updated server code available</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Step 2: Deploy Using Scripts (Recommended)
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Use the automated deployment scripts for the easiest deployment:
                </p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <code className="text-sm">chmod +x deploy_server.sh && chmod +x test_endpoints.sh</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyCommand(commands.makeExecutable)}
                    >
                      {copiedCommand === commands.makeExecutable ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <code className="text-sm">./deploy_server.sh</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyCommand(commands.runDeploy)}
                    >
                      {copiedCommand === commands.runDeploy ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Step 3: Manual Deployment (Alternative)
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Or deploy manually using the Supabase CLI:
                </p>
                
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <code className="text-sm">supabase functions deploy server --project-ref YOUR_PROJECT_REF</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyCommand(commands.deploy)}
                  >
                    {copiedCommand === commands.deploy ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Step 4: Environment Variables
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Ensure these environment variables are set in your Supabase project:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Badge variant="outline">DROPBOX_ACCESS_TOKEN</Badge>
                  <Badge variant="outline">GOOGLE_SHEETS_API_KEY</Badge>
                  <Badge variant="outline">GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON</Badge>
                  <Badge variant="outline">ON2COOK_SPREADSHEET_ID</Badge>
                  <Badge variant="outline">SUPABASE_URL</Badge>
                  <Badge variant="outline">SUPABASE_SERVICE_ROLE_KEY</Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Step 5: Test Deployment
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Test your deployment to ensure everything works:
                </p>
                
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <code className="text-sm">./test_endpoints.sh</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyCommand(commands.runTest)}
                  >
                    {copiedCommand === commands.runTest ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">What This Fixes</p>
                <ul className="text-sm text-green-700 list-disc list-inside mt-1">
                  <li>Dropbox "Unexpected response: 200" errors</li>
                  <li>Improved error handling for API calls</li>
                  <li>Better JSON parsing for Dropbox responses</li>
                  <li>Enhanced token validation and storage</li>
                  <li>Complete endpoint implementation</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                asChild
                className="flex-1"
              >
                <a 
                  href="https://supabase.com/dashboard" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Supabase Dashboard
                </a>
              </Button>
              <Button 
                variant="outline"
                asChild
                className="flex-1"
              >
                <a 
                  href="/DeploymentGuide.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Full Guide
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Common Issues & Solutions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">❌ "Function not found" error</h4>
            <p className="text-sm text-muted-foreground">
              The function name should be exactly "server". Redeploy with the correct name.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-sm mb-2">❌ "Environment variable missing" errors</h4>
            <p className="text-sm text-muted-foreground">
              Go to Supabase Dashboard → Settings → Environment Variables and add the required variables.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-sm mb-2">❌ "Import not found" errors</h4>
            <p className="text-sm text-muted-foreground">
              Ensure all files in the /supabase/functions/server/ directory are properly uploaded.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-sm mb-2">❌ "Authentication failed" errors</h4>
            <p className="text-sm text-muted-foreground">
              Run "supabase login" and "supabase link --project-ref YOUR_PROJECT_REF" first.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};