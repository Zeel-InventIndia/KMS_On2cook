import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, Camera, FileText, X, CheckCircle, AlertCircle, Cloud } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function GoogleDriveTestComponent() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [testStatus, setTestStatus] = useState<string>('');
  const [testing, setTesting] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files);
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setTestStatus(`✅ Selected ${newFiles.length} file(s) successfully!`);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const testDropboxAPI = async () => {
    setTesting(true);
    setTestStatus('🔄 Testing Dropbox API connection...');

    try {
      // First test the debug endpoint to check configuration
      const debugResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        setTestStatus('🔄 Dropbox token is valid, testing folder creation...');
        
        // Now test folder creation
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/create-folder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ 
            folderName: 'Test_Folder_' + Date.now()
          })
        });

        if (response.ok) {
          const folderData = await response.json();
          setTestStatus(`✅ Dropbox integration working! Created folder: ${folderData.folderName}`);
        } else {
          const error = await response.text();
          setTestStatus(`❌ Folder creation failed: ${error}`);
        }
      } else {
        const debugError = await debugResponse.text();
        setTestStatus(`❌ Dropbox configuration issue: ${debugError}`);
      }
    } catch (error) {
      setTestStatus(`❌ Error testing Dropbox API: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="size-6 text-blue-600" />
              Dropbox Integration Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* File Selection Test */}
            <div className="space-y-4">
              <Label className="text-lg font-medium">1. File Selection Test</Label>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <Upload className="size-12 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      Click to test file selection
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Select images, videos, or documents
                    </p>
                  </div>
                  <div className="flex justify-center gap-4">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf,.doc,.docx"
                      style={{ display: 'none' }}
                      id="test-file-input"
                      onChange={(e) => handleFileSelect(e.target.files)}
                    />
                    <Button 
                      variant="outline" 
                      className="gap-2" 
                      type="button"
                      onClick={() => {
                        const fileInput = document.getElementById('test-file-input') as HTMLInputElement;
                        fileInput?.click();
                      }}
                    >
                      <Camera className="size-4" />
                      Select Test Files
                    </Button>
                  </div>
                </div>
              </div>

              {/* Selected Files Display */}
              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <Label>Selected Files ({selectedFiles.length})</Label>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded">
                            {file.type.startsWith('image/') ? (
                              <Camera className="size-4 text-green-600" />
                            ) : file.type.startsWith('video/') ? (
                              <Upload className="size-4 text-blue-600" />
                            ) : (
                              <FileText className="size-4 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dropbox API Test */}
            <div className="space-y-4">
              <Label className="text-lg font-medium">2. Dropbox API Test</Label>
              
              <div className="space-y-3">
                <Button 
                  onClick={testDropboxAPI}
                  disabled={testing}
                  className="gap-2"
                >
                  {testing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="size-4" />
                      Test Dropbox Connection
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Status Display */}
            {testStatus && (
              <Alert className={testStatus.includes('✅') ? 'border-green-200 bg-green-50' : 
                              testStatus.includes('❌') ? 'border-red-200 bg-red-50' : 
                              'border-blue-200 bg-blue-50'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {testStatus}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Dropbox API Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-lg mb-2">Step 1: Create Dropbox App</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Go to <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Dropbox Developers Console</a></li>
                  <li>Click "Create app"</li>
                  <li>Choose "Full Dropbox" access</li>
                  <li>Give your app a name like "On2Cook Media Manager"</li>
                </ol>
              </div>

              <div>
                <h3 className="font-medium text-lg mb-2">Step 2: Get Access Token</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>In your app settings, scroll to "OAuth 2"</li>
                  <li>Click "Generate access token"</li>
                  <li>Copy the generated token</li>
                  <li>Set the DROPBOX_ACCESS_TOKEN environment variable</li>
                </ol>
              </div>

              <div>
                <h3 className="font-medium text-lg mb-2">Step 3: Configure Permissions</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>In "Permissions" tab, enable:</li>
                  <li className="ml-4">• files.content.write</li>
                  <li className="ml-4">• files.content.read</li>
                  <li className="ml-4">• sharing.write</li>
                  <li className="ml-4">• sharing.read</li>
                  <li>Submit the permissions for review (or use development mode)</li>
                </ol>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Environment Variables Needed:</h4>
                <div className="text-sm text-yellow-700 space-y-1">
                  <p><code>DROPBOX_ACCESS_TOKEN</code> - Your Dropbox access token</p>
                  <p><em>Note:</em> For production, consider using OAuth 2.0 flow instead of a long-lived token</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Testing the File Selection:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                  <li>Try selecting multiple files using the "Select Test Files" button above</li>
                  <li>Files should appear in the list with proper file type icons</li>
                  <li>You should be able to remove files by clicking the X button</li>
                  <li>This tests the core file selection functionality that's used in VijayView</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}