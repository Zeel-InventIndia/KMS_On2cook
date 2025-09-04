import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { 
  Terminal, 
  Copy, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Upload,
  Code,
  Zap
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';

export function DeploymentInstructions() {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(label);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const commands = {
    install: `# Install Supabase CLI if not already installed
npm install -g supabase`,
    
    login: `# Login to Supabase
supabase login`,
    
    deploy: `# Deploy the fixed server function
supabase functions deploy make-server-3005c377 --project-ref ${projectId}`,
    
    deployNpm: `# Alternative: Deploy using npx
npx supabase functions deploy make-server-3005c377 --project-ref ${projectId}`,
    
    logs: `# Check function logs after deployment
supabase functions logs make-server-3005c377 --project-ref ${projectId}`,
    
    test: `# Test the deployed function
curl -X GET "https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health" \\
  -H "Authorization: Bearer YOUR_ANON_KEY"`
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Emergency Deployment Fix
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <strong>Critical Issues Detected:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>404 errors for Dropbox token endpoints</li>
                <li>Server deployment is missing latest fixes</li>
                <li>CSV parsing syntax error has been fixed but needs deployment</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              <strong>Good News:</strong> All fixes are ready and just need to be deployed to your Supabase project.
            </AlertDescription>
          </Alert>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="flex items-center gap-2 font-medium text-blue-800 mb-3">
              <Zap className="h-4 w-4" />
              Quick Deployment Steps
            </h4>
            <div className="space-y-3">
              {Object.entries(commands).map(([key, command], index) => (
                <div key={key} className="bg-white border border-blue-200 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-700">
                      Step {index + 1}: {key === 'install' ? 'Install CLI' : key === 'login' ? 'Login' : key === 'deploy' ? 'Deploy Function' : key === 'deployNpm' ? 'Alternative Deploy' : key === 'logs' ? 'Check Logs' : 'Test Function'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(command, key)}
                      className="text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {copiedCommand === key ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <Textarea
                    value={command}
                    readOnly
                    className="text-xs font-mono bg-gray-50 min-h-[60px] resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <h4 className="flex items-center gap-2 font-medium text-orange-800 mb-2">
                  <Code className="h-4 w-4" />
                  What This Fixes
                </h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Adds missing Dropbox token management endpoints</li>
                  <li>• Fixes CSV parsing syntax error</li>
                  <li>• Enables proper file upload functionality</li>
                  <li>• Resolves 404 endpoint errors</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <h4 className="flex items-center gap-2 font-medium text-green-800 mb-2">
                  <CheckCircle className="h-4 w-4" />
                  After Deployment
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Dropbox token updates will work</li>
                  <li>• File uploads will function properly</li>
                  <li>• CSV data loading will be more reliable</li>
                  <li>• All 404 errors should be resolved</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Alert className="border-blue-200 bg-blue-50">
            <Terminal className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              <strong>Need Help?</strong> If you don't have the Supabase CLI set up locally, you can also deploy through the Supabase Dashboard under "Edge Functions" or contact your technical team.
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => window.open('https://supabase.com/docs/guides/functions/deploy', '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Official Deployment Guide
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.open(`https://supabase.com/dashboard/project/${projectId}/functions`, '_blank')}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Supabase Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}