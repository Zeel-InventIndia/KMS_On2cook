import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  WifiOff, 
  Database,
  RefreshCw,
  Settings,
  Eye,
  Download,
  Upload,
  Globe,
  ServerOff
} from 'lucide-react';
import { DemoRequest, User, Task } from '../App';
import { createMockData } from '../utils/mockDataHelpers';

interface OfflineModeProps {
  user: User;
  onDataLoaded: (data: { demoRequests: DemoRequest[], tasks: Task[] }) => void;
  onExitOfflineMode: () => void;
  currentError?: string;
}

interface StoredData {
  demoRequests: DemoRequest[];
  tasks: Task[];
  lastUpdated: string;
  version: number;
}

export function OfflineMode({ user, onDataLoaded, onExitOfflineMode, currentError }: OfflineModeProps) {
  const [localData, setLocalData] = useState<StoredData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLocalData, setHasLocalData] = useState(false);

  useEffect(() => {
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
    try {
      setIsLoading(true);
      
      // Try to load data from localStorage first
      const savedData = localStorage.getItem('on2cook_offline_data');
      if (savedData) {
        try {
          const parsedData: StoredData = JSON.parse(savedData);
          // Validate data structure
          if (parsedData.demoRequests && Array.isArray(parsedData.demoRequests)) {
            setLocalData(parsedData);
            setHasLocalData(true);
            console.log('✅ Loaded local data:', parsedData.demoRequests.length, 'demos');
            return;
          }
        } catch (parseError) {
          console.warn('⚠️ Failed to parse saved data:', parseError);
        }
      }

      // No valid local data, create fresh sample data
      console.log('📝 Creating fresh sample data for offline mode');
      const mockData = createMockData();
      const freshData: StoredData = {
        demoRequests: mockData.demoRequests,
        tasks: mockData.tasks,
        lastUpdated: new Date().toISOString(),
        version: 1
      };
      
      setLocalData(freshData);
      saveDataLocally(freshData);
      setHasLocalData(true);
      
    } catch (error) {
      console.error('❌ Error loading local data:', error);
      // Even if there's an error, provide minimal data
      const emergencyData: StoredData = {
        demoRequests: [],
        tasks: [],
        lastUpdated: new Date().toISOString(),
        version: 1
      };
      setLocalData(emergencyData);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDataLocally = (data: StoredData) => {
    try {
      localStorage.setItem('on2cook_offline_data', JSON.stringify(data));
      console.log('💾 Data saved locally');
    } catch (error) {
      console.error('❌ Failed to save data locally:', error);
    }
  };

  const useOfflineData = () => {
    if (localData) {
      onDataLoaded({
        demoRequests: localData.demoRequests,
        tasks: localData.tasks
      });
    }
  };

  const tryReconnect = () => {
    onExitOfflineMode();
  };

  const clearLocalData = () => {
    if (confirm('This will clear all locally stored data. Are you sure?')) {
      localStorage.removeItem('on2cook_offline_data');
      loadLocalData();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Initializing offline mode...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <WifiOff className="h-5 w-5 text-orange-600" />
                  Offline Mode Active
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  External services are unavailable. Working with local data only.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={tryReconnect} className="gap-2">
                  <Globe className="h-4 w-4" />
                  Try Reconnect
                </Button>
                <Button variant="outline" onClick={useOfflineData} className="gap-2">
                  <Database className="h-4 w-4" />
                  Continue Offline
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Error Information */}
        <Alert className="border-orange-200 bg-orange-50">
          <ServerOff className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-orange-800">Service Connection Issues</p>
              <p className="text-sm text-orange-700">
                {currentError || 'Unable to connect to external services (Google Sheets, Dropbox)'}
              </p>
              <details className="text-xs">
                <summary className="cursor-pointer text-orange-600 hover:text-orange-800">
                  View technical details
                </summary>
                <div className="mt-2 font-mono bg-orange-100 p-2 rounded">
                  {currentError}
                </div>
              </details>
            </div>
          </AlertDescription>
        </Alert>

        {/* Local Data Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Local Data Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasLocalData && localData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-800">{localData.demoRequests.length}</div>
                    <div className="text-sm text-green-600">Demo Requests</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-800">{localData.tasks.length}</div>
                    <div className="text-sm text-blue-600">Tasks</div>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <strong>Last Updated:</strong> {new Date(localData.lastUpdated).toLocaleString()}
                </div>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Local data is available. You can continue working offline with full functionality except:
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>Real-time sync with Google Sheets</li>
                      <li>New data from external sources</li>
                      <li>Dropbox file uploads</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2">
                  <Button onClick={useOfflineData} className="flex-1 gap-2">
                    <Eye className="h-4 w-4" />
                    Continue with Local Data
                  </Button>
                  <Button variant="outline" onClick={clearLocalData} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Reset Data
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                <p className="font-medium mb-2">No Local Data Available</p>
                <p className="text-sm text-muted-foreground mb-4">
                  This is the first time accessing offline mode. We'll create sample data for you.
                </p>
                <Button onClick={loadLocalData} className="gap-2">
                  <Download className="h-4 w-4" />
                  Initialize Offline Data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Service Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="font-medium">Google Sheets</span>
                </div>
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  Unavailable
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="font-medium">Dropbox</span>
                </div>
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  Token Invalid
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Local Storage</span>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Available
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Working in Offline Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">✅ What Works Offline:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>View and manage demo requests</li>
                  <li>Add and edit recipes</li>
                  <li>Schedule demos to teams</li>
                  <li>Create and manage tasks</li>
                  <li>Generate reports from local data</li>
                  <li>All role-based permissions and filtering</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 text-orange-600">⚠️ Limited Functionality:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>No real-time sync with Google Sheets</li>
                  <li>Cannot receive new demo requests from sheets</li>
                  <li>File uploads to Dropbox unavailable</li>
                  <li>Changes won't persist to external systems</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2 text-blue-600">🔄 To Restore Full Functionality:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Check Google Sheets sharing: Must be "Anyone with link can view"</li>
                  <li>Update Dropbox token: Generate new token from App Console</li>
                  <li>Test connection using "Try Reconnect" button</li>
                  <li>Contact system administrator if issues persist</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}