import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { 
  Zap, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Key, 
  Globe,
  ExternalLink,
  Copy,
  Settings
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { serviceMonitor } from '../utils/serviceMonitor';

interface QuickServiceRecoveryProps {
  onServicesRestored?: () => void;
}

export function QuickServiceRecovery({ onServicesRestored }: QuickServiceRecoveryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [newDropboxToken, setNewDropboxToken] = useState('');
  const [fixResults, setFixResults] = useState<{ service: string, status: string, message: string }[]>([]);

  const quickFix = async () => {
    setIsFixing(true);
    setFixResults([]);
    const results: { service: string, status: string, message: string }[] = [];

    console.log('⚡ Starting quick service recovery...');

    // Test 1: Check current system health
    try {
      console.log('🏥 Checking system health...');
      const health = await serviceMonitor.checkSystemHealth();
      
      const healthyServices = health.services.filter(s => s.status === 'online').length;
      const totalServices = health.services.length;
      
      results.push({
        service: 'System Health',
        status: health.overall,
        message: `${healthyServices}/${totalServices} services online`
      });

      // If Google Sheets is the main issue, try alternative approaches
      const sheetsService = health.services.find(s => s.name === 'Google Sheets');
      if (sheetsService && sheetsService.status === 'offline') {
        console.log('📊 Google Sheets is offline, testing quick fix...');
        
        // Try a quick Google Sheets bypass test
        const quickTest = await serviceMonitor.quickGoogleSheetsCheck();
        if (!quickTest) {
          results.push({
            service: 'Google Sheets',
            status: 'error',
            message: 'Spreadsheet access denied. Please check sharing settings or try different URL.'
          });
        }
      }

      // If Dropbox token is the issue and user provided a new one
      const dropboxService = health.services.find(s => s.name === 'Dropbox');
      if (dropboxService && dropboxService.status === 'offline' && newDropboxToken.trim()) {
        console.log('🔑 Testing new Dropbox token...');
        
        try {
          const tokenResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/update-token`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              token: newDropboxToken.trim(),
              updatedBy: 'Quick Recovery'
            })
          });

          const tokenResult = await tokenResponse.json();
          if (tokenResult.success) {
            results.push({
              service: 'Dropbox Token',
              status: 'success',
              message: `Token updated successfully for ${tokenResult.accountInfo?.name || 'account'}`
            });
            setNewDropboxToken(''); // Clear the input
          } else {
            results.push({
              service: 'Dropbox Token',
              status: 'error',
              message: tokenResult.details || tokenResult.error || 'Token update failed'
            });
          }
        } catch (tokenError) {
          results.push({
            service: 'Dropbox Token',
            status: 'error',
            message: tokenError instanceof Error ? tokenError.message : 'Token test failed'
          });
        }
      }

    } catch (healthError) {
      results.push({
        service: 'Health Check',
        status: 'error',
        message: healthError instanceof Error ? healthError.message : 'Health check failed'
      });
    }

    setFixResults(results);
    
    // If any fixes were successful, notify parent
    const successfulFixes = results.filter(r => r.status === 'success').length;
    if (successfulFixes > 0 && onServicesRestored) {
      setTimeout(() => {
        onServicesRestored();
      }, 2000); // Give time to show results
    }

    setIsFixing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'online':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
      case 'offline':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'online':
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const copySpreadsheetUrl = () => {
    const url = 'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/edit?usp=sharing';
    navigator.clipboard.writeText(url);
    alert('Spreadsheet URL copied to clipboard!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="h-4 w-4" />
          Quick Fix
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Service Recovery
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Fix Button */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
            <div>
              <h3 className="font-medium">Run Quick Diagnostics & Fix</h3>
              <p className="text-sm text-muted-foreground">
                Automatically test and attempt to fix common service issues
              </p>
            </div>
            <Button onClick={quickFix} disabled={isFixing} className="gap-2">
              {isFixing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {isFixing ? 'Fixing...' : 'Quick Fix'}
            </Button>
          </div>

          {/* Fix Results */}
          {fixResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fix Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {fixResults.map((result, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{result.service}</span>
                          <Badge className={`${getStatusColor(result.status)} text-xs`}>
                            {result.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manual Fixes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dropbox Token Fix */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Update Dropbox Token
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="dropbox-token" className="text-sm">
                    New Dropbox Access Token
                  </Label>
                  <Input
                    id="dropbox-token"
                    type="password"
                    value={newDropboxToken}
                    onChange={(e) => setNewDropboxToken(e.target.value)}
                    placeholder="sl.xxx..."
                    className="text-sm font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get from <a 
                      href="https://www.dropbox.com/developers/apps" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Dropbox App Console ↗
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Google Sheets Fix */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Google Sheets Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm mb-2">Current spreadsheet URL:</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={copySpreadsheetUrl}
                      className="gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy URL
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/edit?usp=sharing', '_blank')}
                      className="gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open Sheet
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Make sure sharing is set to "Anyone with the link can view"
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Common Issues & Solutions:</p>
                <div className="text-sm space-y-1">
                  <p><strong>Google Sheets:</strong> Change sharing to "Anyone with link can view" and ensure sheet exists</p>
                  <p><strong>Dropbox:</strong> Generate new access token with files.content.write permission</p>
                  <p><strong>Network:</strong> Check firewall settings and internet connectivity</p>
                  <p><strong>Persistent Issues:</strong> Use offline mode for uninterrupted work</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            {onServicesRestored && (
              <Button onClick={() => { setIsOpen(false); onServicesRestored(); }} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Test Connection
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}