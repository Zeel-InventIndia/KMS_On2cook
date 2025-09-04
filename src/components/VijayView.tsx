import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Upload, 
  Calendar, 
  Clock, 
  User as UserIcon, 
  Phone, 
  Mail,
  Users,
  Link,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Key,
  Settings,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import { User as UserType, DemoRequest, Task } from '../App';
import { formatDateSafely } from '../utils/helpers';
import { checkServerHealth, createDropboxFolder, uploadFilesToDropbox, ServerHealthData } from '../utils/vijayViewHelpers';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { DropboxTokenRefresh } from './DropboxTokenRefresh';
import { GoogleSheetsUpdater } from './GoogleSheetsUpdater';
import { SystemDiagnosticPanel } from './SystemDiagnosticPanel';
import { ErrorRecoveryPanel } from './ErrorRecoveryPanel';

interface VijayViewProps {
  user: UserType;
  demoRequests: DemoRequest[];
  tasks: Task[];
  onUpdateDemoRequest: (request: DemoRequest) => void;
  onLogout: () => void;
}

export function VijayView({ 
  user, 
  demoRequests, 
  tasks, 
  onUpdateDemoRequest, 
  onLogout 
}: VijayViewProps) {
  const [selectedItem, setSelectedItem] = useState<DemoRequest | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<ServerHealthData | null>(null);
  const [showTokenRefresh, setShowTokenRefresh] = useState(false);
  const [showTokenManager, setShowTokenManager] = useState(false);
  const [newDropboxToken, setNewDropboxToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenSuccess, setTokenSuccess] = useState(false);
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showErrorRecovery, setShowErrorRecovery] = useState(false);

  const formatDate = (dateString: string) => {
    return formatDateSafely(dateString, dateString);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    console.log(`📁 Selected ${files.length} files:`, files.map(f => ({ name: f.name, size: f.size })));
  };

  const handleServerHealthCheck = async () => {
    const healthData = await checkServerHealth();
    setDebugInfo(healthData);
  };

  const handleUpdateDropboxToken = async () => {
    if (!newDropboxToken.trim()) {
      setTokenError('Please enter a valid Dropbox access token');
      return;
    }

    setIsUpdatingToken(true);
    setTokenError(null);
    setTokenSuccess(false);

    try {
      console.log('🔑 Updating Dropbox token...');
      
      // Send the token to the server for validation and storage
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/update-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          token: newDropboxToken.trim(),
          updatedBy: user.name 
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        let errorMessage = `Failed to update token: ${response.status}`;
        let serverResponseDetails = '';
        
        try {
          // Try to get a response clone first to avoid body stream issues
          const responseClone = response.clone();
          const errorData = await responseClone.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          serverResponseDetails = JSON.stringify(errorData, null, 2);
        } catch (jsonError) {
          try {
            const errorText = await response.text();
            errorMessage = errorText.includes('Invalid Dropbox token') ? 
              'Invalid Dropbox token format or expired token' : 
              errorText || errorMessage;
            serverResponseDetails = errorText;
          } catch (textError) {
            console.error('💥 Failed to read error response:', textError);
            errorMessage = `HTTP ${response.status}: Unable to read server response`;
          }
        }
        
        console.error('🔑 Token update failed:', {
          status: response.status,
          statusText: response.statusText,
          details: serverResponseDetails
        });
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Token updated successfully:', result);
      
      setTokenSuccess(true);
      setNewDropboxToken('');
      setShowTokenManager(false);
      setShowTokenRefresh(false);
      
      // Refresh server health to show updated token status
      setTimeout(() => {
        handleServerHealthCheck();
      }, 1000);
      
      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setTokenSuccess(false);
      }, 5000);

    } catch (error) {
      console.error('💥 Token update failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update token';
      
      // Provide helpful error messages
      if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
        setTokenError('Token update timed out. Please check your connection and try again.');
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        setTokenError('Invalid token provided. Please check your Dropbox access token and try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setTokenError('Network error. Please check your connection and try again.');
      } else {
        setTokenError(`Token update failed: ${errorMessage}`);
      }
    } finally {
      setIsUpdatingToken(false);
    }
  };

  const handleTokenInputChange = (value: string) => {
    setNewDropboxToken(value);
    setTokenError(null);
    setTokenSuccess(false);
    setTestResult(null);
  };

  const validateTokenFormat = (token: string) => {
    // Enhanced Dropbox token validation
    if (!token || typeof token !== 'string') return false;
    
    const trimmed = token.trim();
    
    // Check minimum length
    if (trimmed.length < 20) return false;
    
    // Check for common Dropbox token patterns
    const isShortLivedToken = trimmed.startsWith('sl.') && trimmed.length > 60;
    const isAppToken = trimmed.startsWith('App') && trimmed.length > 60;
    const isLongToken = trimmed.length > 60 && /^[A-Za-z0-9_\-\.]+$/.test(trimmed);
    
    return isShortLivedToken || isAppToken || isLongToken;
  };

  const handleTestToken = async () => {
    if (!newDropboxToken.trim()) {
      setTokenError('Please enter a token to test');
      return;
    }

    setIsTestingToken(true);
    setTestResult(null);
    setTokenError(null);

    try {
      console.log('🧪 Testing Dropbox token...');
      
      // Basic format validation first
      if (!validateTokenFormat(newDropboxToken)) {
        throw new Error('Token format appears invalid - expected longer token starting with "sl." or similar');
      }
      
      // Test the token against the server's test endpoint
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/test-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          token: newDropboxToken.trim() 
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        let errorMessage = 'Token test failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Use default error message
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Token test result:', result);
      
      if (result.valid) {
        setTestResult(`✅ Token is valid! Account: ${result.accountInfo?.name || 'Unknown'}`);
      } else {
        setTestResult(`❌ Token test failed: ${result.error || 'Invalid token'}`);
      }
      
    } catch (error) {
      console.error('🧪 Token test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
        setTestResult('❌ Token test timed out - please check your connection');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setTestResult('❌ Network error during token test');
      } else {
        setTestResult(`❌ Token test failed: ${errorMessage}`);
      }
    } finally {
      setIsTestingToken(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedItem || selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('Initializing upload...');
    setDebugInfo(null);

    try {
      // Step 0: Check server health and environment
      setUploadStatus('Checking server status...');
      const healthData = await checkServerHealth();
      
      if (!healthData) {
        throw new Error('Server health check failed - server may be unavailable');
      }

      if (!healthData.environment?.hasDropboxToken) {
        setShowTokenManager(true);
        throw new Error('Dropbox access token is not configured on the server');
      }

      console.log('✅ Server health check passed');
      setUploadProgress(10);

      // Step 1: Create Dropbox folder
      setUploadStatus('Creating Dropbox folder...');
      const folderName = `${selectedItem.clientName}_${selectedItem.demoDate}_Demo_Media`.replace(/[^a-zA-Z0-9_\-]/g, '_');
      
      const folderResult = await createDropboxFolder(folderName);
      setUploadProgress(30);

      // Step 2: Upload files
      setUploadStatus(`Uploading ${selectedFiles.length} files...`);
      const uploadResult = await uploadFilesToDropbox(selectedFiles, folderResult.folderPath);
      
      const successfulUploads = uploadResult.successfulUploads || 0;
      const totalFiles = uploadResult.totalFiles || selectedFiles.length;
      
      if (successfulUploads === 0) {
        throw new Error('No files were uploaded successfully');
      }
      
      if (successfulUploads < totalFiles) {
        console.warn(`⚠️ Partial upload: ${successfulUploads}/${totalFiles} files uploaded`);
      }
      
      setUploadProgress(80);

      // Step 3: Update demo request locally
      setUploadStatus('Finalizing upload...');
      const updatedRequest = {
        ...selectedItem,
        mediaUploaded: true,
        dropboxLink: folderResult.shareableLink,
        mediaLink: folderResult.shareableLink
      };

      onUpdateDemoRequest(updatedRequest);
      setUploadProgress(100);
      
      const statusMessage = successfulUploads === totalFiles 
        ? 'Upload completed successfully!' 
        : `Upload partially completed: ${successfulUploads}/${totalFiles} files uploaded`;
      
      setUploadStatus(statusMessage);

      // Clear selection
      setSelectedItem(null);
      setSelectedFiles([]);

      // Reset form after 5 seconds
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
        setDebugInfo(null);
      }, 5000);

    } catch (error) {
      console.error('💥 Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Provide specific error messages based on the error content
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        setShowTokenManager(true);
        setUploadStatus('Upload service not available. Please check server configuration or update your Dropbox token.');
      } else if (errorMessage.includes('expired_access_token') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setShowTokenManager(true);
        setUploadStatus('Dropbox access token has expired. Please update your token to continue.');
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        setShowTokenManager(true);
        setUploadStatus('Dropbox access denied. Please check your token permissions and update if needed.');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
        setUploadStatus('Upload timed out. Please try with smaller files or check your connection.');
      } else if (errorMessage.includes('Failed to parse error response')) {
        setUploadStatus('Server communication error. Please check your connection and try again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setUploadStatus('Network error. Please check your connection and try again.');
      } else if (errorMessage.includes('Dropbox token not configured')) {
        setShowTokenManager(true);
        setUploadStatus('Dropbox token is not configured. Please set up your token to continue.');
      } else {
        setUploadStatus(`Upload failed: ${errorMessage}`);
      }
      
      // Keep the error visible for longer
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 10000);
    }
  };

  // Statistics
  const stats = {
    totalCompleted: demoRequests.length,
    withMedia: demoRequests.filter(req => req.mediaUploaded || req.dropboxLink || req.mediaLink).length,
    pendingUpload: demoRequests.filter(req => !req.mediaUploaded && !req.dropboxLink && !req.mediaLink).length
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Media Management</h1>
                <p className="text-muted-foreground">
                  Welcome back, {user.name} • Media Upload Specialist
                </p>
              </div>
              
              {/* Token Status Indicator */}
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  debugInfo?.environment?.hasDropboxToken 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-orange-100 text-orange-700 border border-orange-200'
                }`}>
                  <Key className="h-3 w-3" />
                  {debugInfo?.environment?.hasDropboxToken ? 'Token Active' : 'Token Needed'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowErrorRecovery(!showErrorRecovery)}
                className="text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Fix Errors
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="text-xs"
              >
                <Settings className="h-3 w-3 mr-1" />
                System Check
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowTokenManager(!showTokenManager)}
                className="text-xs"
              >
                <Key className="h-3 w-3 mr-1" />
                Dropbox Token
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleServerHealthCheck}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Check Server
              </Button>
              <Button variant="outline" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Error Recovery Panel */}
        {showErrorRecovery && (
          <div className="mb-6">
            <ErrorRecoveryPanel onClose={() => setShowErrorRecovery(false)} />
          </div>
        )}

        {/* System Diagnostics Panel */}
        {showDiagnostics && (
          <div className="mb-6">
            <SystemDiagnosticPanel />
          </div>
        )}

        {/* Dropbox Token Manager */}
        {showTokenManager && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-800">
                  <Key className="h-5 w-5" />
                  Dropbox Token Manager
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTokenManager(false)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ✕
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tokenSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Dropbox token updated successfully! You can now upload files.
                  </AlertDescription>
                </Alert>
              )}

              {tokenError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{tokenError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="dropbox-token" className="text-sm font-medium">
                      New Dropbox Access Token
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="dropbox-token"
                        type={showToken ? 'text' : 'password'}
                        value={newDropboxToken}
                        onChange={(e) => handleTokenInputChange(e.target.value)}
                        placeholder="Enter your Dropbox access token..."
                        className="pr-10"
                        disabled={isUpdatingToken}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowToken(!showToken)}
                        disabled={isUpdatingToken}
                      >
                        {showToken ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    
                    {newDropboxToken && !validateTokenFormat(newDropboxToken) && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ This doesn't look like a valid Dropbox token format
                      </p>
                    )}
                    
                    <p className="text-xs text-blue-600 mt-1">
                      Paste the access token from your Dropbox App Console
                    </p>
                  </div>

                  {testResult && (
                    <Alert className={testResult.includes('✅') ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
                      <AlertDescription className={testResult.includes('✅') ? 'text-green-700' : 'text-orange-700'}>
                        {testResult}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleTestToken}
                      disabled={!newDropboxToken.trim() || isTestingToken || isUpdatingToken}
                      className="flex-1"
                    >
                      {isTestingToken ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Testing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Test Token
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleUpdateDropboxToken}
                      disabled={!newDropboxToken.trim() || isUpdatingToken || isTestingToken}
                      className="flex-1"
                    >
                      {isUpdatingToken ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Settings className="h-4 w-4 mr-2" />
                          Update Token
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => window.open('https://www.dropbox.com/developers/apps', '_blank')}
                      className="flex items-center gap-2"
                      disabled={isUpdatingToken || isTestingToken}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Get Token
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-blue-800">How to get a new Dropbox token:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-blue-700">
                    <li>Visit the Dropbox App Console (click "Get Token" button)</li>
                    <li>Select your app or create a new one if needed</li>
                    <li>Go to the "Settings" tab of your app</li>
                    <li>Scroll down to "Generated access token" section</li>
                    <li>Click "Generate" to create a new access token</li>
                    <li>Copy the entire token and paste it above</li>
                  </ol>
                  
                  <div className="bg-blue-100 p-3 rounded text-xs">
                    <strong className="text-blue-800">Important:</strong>
                    <ul className="text-blue-700 mt-1 space-y-1">
                      <li>• Keep your token secure and private</li>
                      <li>• Tokens typically start with "sl." or similar</li>
                      <li>• Generate a new token if uploads fail</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Token Refresh Panel (Legacy) */}
        {showTokenRefresh && !showTokenManager && (
          <div className="mb-6">
            <DropboxTokenRefresh 
              onTokenRefreshed={() => {
                setShowTokenRefresh(false);
                setUploadStatus('');
              }}
            />
          </div>
        )}

        {/* Debug Info Panel */}
        {debugInfo && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-800">Server Status</CardTitle>
            </CardHeader>
            <CardContent className="text-xs">
              <div className="grid grid-cols-2 gap-4 text-blue-700">
                <div>
                  <strong>Status:</strong> {debugInfo.status}
                </div>
                <div>
                  <strong>Dropbox Token:</strong> {debugInfo.environment?.hasDropboxToken ? '✅ Configured' : '❌ Missing'}
                </div>
                <div>
                  <strong>Token Length:</strong> {debugInfo.environment?.dropboxTokenLength || 'N/A'} chars
                </div>
                <div>
                  <strong>Token Status:</strong> {
                    debugInfo.environment?.hasDropboxToken 
                      ? (debugInfo.environment?.dropboxTokenLength > 60 ? '✅ Valid Format' : '⚠️ Short Token') 
                      : '❌ Not Set'
                  }
                </div>
                <div>
                  <strong>Upload Ready:</strong> {
                    debugInfo.environment?.hasDropboxToken 
                      ? '✅ Ready to Upload' 
                      : '❌ Token Required'
                  }
                </div>
                <div>
                  <strong>Last Check:</strong> {new Date(debugInfo.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Demos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompleted}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Media Uploaded</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.withMedia}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Upload</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingUpload}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Completed Demos List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Completed Demos ({demoRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-auto">
              <div className="space-y-3">
                {demoRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No completed demos available</p>
                    <p className="text-sm">Demos marked as "demo given" will appear here</p>
                  </div>
                ) : (
                  demoRequests.map((item) => (
                    <div 
                      key={item.id} 
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedItem?.id === item.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:bg-accent/50'
                      }`}
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{item.clientName}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(item.demoDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.demoTime}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Demo Given
                          </Badge>
                          {(item.mediaUploaded || item.dropboxLink || item.mediaLink) && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              ✓ Media Uploaded
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Sales Rep:</span> {item.salesRep}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Assignee:</span> {item.assignee}
                          </div>
                        </div>

                        <div className="text-sm">
                          <span className="text-muted-foreground">Contact:</span>{' '}
                          <span className="flex items-center gap-1 inline-flex">
                            <Phone className="h-3 w-3" />
                            {item.clientMobile}
                          </span>
                          {' • '}
                          <span className="flex items-center gap-1 inline-flex">
                            <Mail className="h-3 w-3" />
                            {item.clientEmail}
                          </span>
                        </div>

                        {item.recipes.length > 0 && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Recipes:</span>{' '}
                            <span>{item.recipes.slice(0, 3).join(', ')}</span>
                            {item.recipes.length > 3 && (
                              <span className="text-muted-foreground"> +{item.recipes.length - 3} more</span>
                            )}
                          </div>
                        )}

                        {item.assignedTeam && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Kitchen Team:</span> Team {item.assignedTeam}
                          </div>
                        )}

                        {/* Enhanced Media Link Display */}
                        {(item.dropboxLink || item.mediaLink) && (
                          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-700">Media Folder Available</span>
                              </div>
                              <a
                                href={item.dropboxLink || item.mediaLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link className="h-3 w-3" />
                                Open Folder
                              </a>
                            </div>
                            <div className="text-xs text-green-600 mt-1 font-mono truncate">
                              {(item.dropboxLink || item.mediaLink)?.substring(0, 60)}...
                            </div>
                          </div>
                        )}

                        {item.notes && (
                          <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                            <strong>Notes:</strong> {item.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upload Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Media Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedItem ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Upload className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select a completed demo to upload media files</p>
                  <p className="text-sm mt-2">Click on any demo from the left panel to get started</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Selected Demo Info */}
                  <div className="bg-accent/30 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Selected Demo</h4>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 mb-1">
                        <UserIcon className="h-3 w-3" />
                        {selectedItem.clientName}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(selectedItem.demoDate)} at {selectedItem.demoTime}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Sales Rep: {selectedItem.salesRep}
                      </div>
                    </div>
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Select Media Files
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      disabled={isUploading}
                    />
                    {selectedFiles.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground mb-1">
                          Selected files ({selectedFiles.length}):
                        </p>
                        <div className="max-h-24 overflow-y-auto">
                          {selectedFiles.map((file, index) => (
                            <div key={index} className="text-xs text-muted-foreground truncate">
                              • {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Upload Progress */}
                  {isUploading && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Upload Progress</span>
                        <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="w-full" />
                      <p className="text-sm text-muted-foreground">{uploadStatus}</p>
                    </div>
                  )}

                  {/* Upload Button */}
                  <Button 
                    onClick={handleUpload} 
                    disabled={selectedFiles.length === 0 || isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload to Dropbox ({selectedFiles.length} files)
                      </>
                    )}
                  </Button>

                  {/* Existing Media Link */}
                  {(selectedItem.dropboxLink || selectedItem.mediaLink) && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderOpen className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">
                          Media Already Available
                        </span>
                      </div>
                      <a
                        href={selectedItem.dropboxLink || selectedItem.mediaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                      >
                        <Link className="h-3 w-3" />
                        View Existing Media Folder
                      </a>
                      <div className="text-xs text-green-600 mt-1 opacity-75">
                        You can upload additional files to the same folder
                      </div>
                    </div>
                  )}

                  {/* Google Sheets Update - Only for Vijay */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-blue-700">
                          Update Google Sheets
                        </div>
                        <div className="text-xs text-blue-600">
                          Sync media link and notes to the master spreadsheet
                        </div>
                      </div>
                      <GoogleSheetsUpdater 
                        demoRequest={selectedItem}
                        userRole="vijay"
                        showMediaInput={true}
                        onUpdated={() => {
                          console.log('✅ Google Sheets updated by Vijay');
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}