import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink,
  Info,
  Settings
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { ErrorAlert } from './ErrorAlert';

interface SystemStatusIndicatorProps {
  dataSource: 'csv' | 'csv-client' | 'mock' | 'loading';
  csvError?: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

interface SystemStatus {
  googleSheets: 'working' | 'error' | 'checking';
  dropboxEndpoint: 'working' | 'error' | 'checking';
  server: 'working' | 'error' | 'checking';
}

export const SystemStatusIndicator: React.FC<SystemStatusIndicatorProps> = ({
  dataSource,
  csvError,
  onRefresh,
  isRefreshing = false
}) => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    googleSheets: 'checking',
    dropboxEndpoint: 'checking',
    server: 'checking'
  });
  const [showDetails, setShowDetails] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const checkSystemStatus = async () => {
    console.log('🔍 Checking system status...');
    
    const newStatus: SystemStatus = {
      googleSheets: 'checking',
      dropboxEndpoint: 'checking',
      server: 'checking'
    };
    setSystemStatus(newStatus);

    try {
      // Check server health
      const healthResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
          signal: AbortSignal.timeout(8000)
        }
      );
      
      if (healthResponse.ok) {
        newStatus.server = 'working';
        console.log('✅ Server is healthy');
      } else {
        newStatus.server = 'error';
        console.log('❌ Server health check failed');
      }
    } catch (error) {
      newStatus.server = 'error';
      console.log('❌ Server unreachable:', error);
    }

    // Check Google Sheets access
    try {
      const csvUrl = 'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455';
      const csvResponse = await fetch(csvUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(8000)
      });
      
      if (csvResponse.ok) {
        newStatus.googleSheets = 'working';
        console.log('✅ Google Sheets access working');
      } else {
        newStatus.googleSheets = 'error';
        console.log('❌ Google Sheets access failed:', csvResponse.status);
      }
    } catch (error) {
      newStatus.googleSheets = 'error';
      console.log('❌ Google Sheets unreachable:', error);
    }

    // Check Dropbox endpoint (basic connectivity test)
    if (newStatus.server === 'working') {
      try {
        const dropboxResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/test-token`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: 'test-token' }),
            signal: AbortSignal.timeout(8000)
          }
        );
        
        // Any response (even 400) means the endpoint is working
        if (dropboxResponse.status === 400 || dropboxResponse.ok) {
          newStatus.dropboxEndpoint = 'working';
          console.log('✅ Dropbox endpoint accessible');
        } else {
          newStatus.dropboxEndpoint = 'error';
          console.log('❌ Dropbox endpoint failed:', dropboxResponse.status);
        }
      } catch (error) {
        newStatus.dropboxEndpoint = 'error';
        console.log('❌ Dropbox endpoint unreachable:', error);
      }
    } else {
      newStatus.dropboxEndpoint = 'error';
    }

    setSystemStatus(newStatus);
    setLastCheck(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const getStatusIcon = (status: 'working' | 'error' | 'checking') => {
    switch (status) {
      case 'working': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'checking': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
    }
  };

  const getStatusBadge = (status: 'working' | 'error' | 'checking') => {
    switch (status) {
      case 'working': return <Badge className="bg-green-100 text-green-800 border-green-200">Working</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'checking': return <Badge variant="outline">Checking...</Badge>;
    }
  };

  const hasErrors = Object.values(systemStatus).includes('error');
  const isAllChecking = Object.values(systemStatus).every(status => status === 'checking');

  const getDataSourceStatus = () => {
    if (dataSource === 'mock') {
      return {
        color: 'text-yellow-600',
        text: 'Using Sample Data',
        description: 'External data sources unavailable'
      };
    }
    if (dataSource === 'csv') {
      return {
        color: 'text-green-600',
        text: 'Live Data (Server)',
        description: 'Connected to Google Sheets via server'
      };
    }
    if (dataSource === 'csv-client') {
      return {
        color: 'text-blue-600',
        text: 'Live Data (Direct)',
        description: 'Connected to Google Sheets directly'
      };
    }
    return {
      color: 'text-gray-600',
      text: 'Loading...',
      description: 'Checking data sources'
    };
  };

  const status = getDataSourceStatus();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            System Status
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={checkSystemStatus}
              disabled={isAllChecking}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isAllChecking ? 'animate-spin' : ''}`} />
              Check
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Settings className="h-3 w-3 mr-1" />
              {showDetails ? 'Hide' : 'Details'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Source Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${
              dataSource === 'mock' ? 'bg-yellow-500' : 
              dataSource === 'loading' ? 'bg-gray-400' : 'bg-green-500'
            }`} />
            <div>
              <div className={`font-medium ${status.color}`}>{status.text}</div>
              <div className="text-sm text-muted-foreground">{status.description}</div>
            </div>
          </div>
          {lastCheck && (
            <div className="text-xs text-muted-foreground">
              Last check: {lastCheck}
            </div>
          )}
        </div>

        {/* System Component Status */}
        {showDetails && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(systemStatus.server)}
                  <span className="text-sm">Server</span>
                </div>
                {getStatusBadge(systemStatus.server)}
              </div>
              
              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(systemStatus.googleSheets)}
                  <span className="text-sm">Google Sheets</span>
                </div>
                {getStatusBadge(systemStatus.googleSheets)}
              </div>
              
              <div className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  {getStatusIcon(systemStatus.dropboxEndpoint)}
                  <span className="text-sm">File Upload</span>
                </div>
                {getStatusBadge(systemStatus.dropboxEndpoint)}
              </div>
            </div>
          </div>
        )}

        {/* Error Alerts and Solutions */}
        {csvError && (
          <ErrorAlert 
            error={csvError} 
            onRetry={onRefresh}
            isRetrying={isRefreshing}
          />
        )}

        {hasErrors && !csvError && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div>Some system components are experiencing issues.</div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('/?diagnose=upload', '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Diagnose Upload Issues
                </Button>
                {onRefresh && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Retry Data Fetch
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};