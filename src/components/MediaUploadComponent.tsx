import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  FileImage, 
  FileVideo, 
  File,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { DemoRequest } from '../App';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { UploadErrorHandler } from './UploadErrorHandler';
import { RoutingIssueAlert } from './RoutingIssueAlert';
import { handleResponseSafely, safeFetch } from '../utils/safeHttpResponseHandler';
import { normalizeDropboxUploadResponse, callDropboxEndpoint } from '../utils/dropboxUploadHandler';

interface MediaUploadComponentProps {
  demoRequest: DemoRequest;
  onUploadComplete: (mediaLink: string) => void;
  onClose: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  path?: string;
}

export const MediaUploadComponent: React.FC<MediaUploadComponentProps> = ({
  demoRequest,
  onUploadComplete,
  onClose
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [folderName, setFolderName] = useState(`${demoRequest.clientName}_${demoRequest.demoDate}`);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [dropboxError, setDropboxError] = useState<string | null>(null);
  const [showErrorHandler, setShowErrorHandler] = useState(false);
  const [dropboxToken, setDropboxToken] = useState('');
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = Array.from(selectedFiles).map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <FileImage className="h-4 w-4" />;
    }
    if (['mp4', 'avi', 'mov', 'wmv'].includes(ext || '')) {
      return <FileVideo className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  const testDropboxToken = async () => {
    if (!dropboxToken.trim()) {
      setDropboxError('Please enter a Dropbox token');
      return;
    }

    setIsTestingToken(true);
    setDropboxError(null);

    try {
      // ✅ CRITICAL FIX: Use safe response handler to avoid body consumption issues
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/test-token`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token: dropboxToken.trim() }),
          signal: AbortSignal.timeout(10000)
        }
      );

      if (!response.success) {
        throw new Error(response.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = response.data;
      if (result.valid) {
        setTokenValid(true);
        setDropboxError(null);
        console.log('✅ Dropbox token validated:', result.accountInfo?.name);
        
        // Update the token in the server using safe handler
        await safeFetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/update-token`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              token: dropboxToken.trim(),
              updatedBy: 'Media Upload Component'
            }),
            signal: AbortSignal.timeout(10000)
          }
        );
      } else {
        setTokenValid(false);
        setDropboxError(result.error || 'Token validation failed');
      }
    } catch (error) {
      console.error('Token test error:', error);
      setTokenValid(false);
      setDropboxError(error instanceof Error ? error.message : 'Token test failed');
    } finally {
      setIsTestingToken(false);
    }
  };

  const createDropboxFolder = async () => {
    try {
      console.log(`📂 Creating folder: "${folderName}"`);
      
      // ✅ ENHANCED: Clean folder name before sending
      const cleanFolderName = folderName.replace(/[<>:"/\\|?*]/g, '_').trim();
      if (!cleanFolderName || cleanFolderName === '') {
        throw new Error('Invalid folder name');
      }
      
      console.log(`📂 Clean folder name: "${cleanFolderName}"`);
      
      // ✅ CRITICAL FIX: Use safe response handler for folder creation
      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/create-folder`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ folderName: cleanFolderName }),
          signal: AbortSignal.timeout(15000)
        }
      );

      if (!response.success) {
        // Check if it's a conflict (folder already exists)
        if (response.error?.includes('conflict') || response.error?.includes('folder')) {
          console.log('📂 Folder already exists, continuing with upload...');
          return `/${cleanFolderName}`;
        }
        throw new Error(response.error || `Failed to create folder: HTTP ${response.status}: ${response.statusText}`);
      }

      const result = response.data;
      if (result.success) {
        if (result.alreadyExists) {
          console.log('📂 Using existing folder:', result.path);
        } else {
          console.log('✅ Folder created successfully:', result.path);
        }
        return result.path || `/${cleanFolderName}`;
      } else {
        // Handle folder already exists case gracefully
        if (result.error?.includes('conflict') || result.error?.includes('folder')) {
          console.log('📂 Folder conflict detected, assuming it exists:', `/${cleanFolderName}`);
          return `/${cleanFolderName}`;
        }
        console.log('❌ Folder creation failed but response OK:', result);
        throw new Error(result.error || 'Folder creation failed');
      }
    } catch (error) {
      console.error('Folder creation error:', error);
      
      // ✅ ENHANCED: Fallback to using the folder name directly if creation fails
      const cleanFolderName = folderName.replace(/[<>:"/\\|?*]/g, '_').trim() || 'uploads';
      console.log(`🔄 Falling back to folder path: /${cleanFolderName}`);
      
      // Don't throw error if it's just a folder conflict - assume folder exists
      if (error instanceof Error && error.message.includes('conflict')) {
        return `/${cleanFolderName}`;
      }
      
      // For other errors, still return a valid path to allow upload attempt
      console.warn('⚠️ Folder creation failed, but continuing with upload attempt');
      return `/${cleanFolderName}`;
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      setDropboxError('Please select files to upload');
      return;
    }

    if (!tokenValid) {
      setDropboxError('Please test and validate your Dropbox token first');
      return;
    }
    
    // ✅ CRITICAL FIX: Additional validation for file objects
    const invalidFiles = files.filter(f => !f.file || !(f.file instanceof File) || f.file.size === 0);
    if (invalidFiles.length > 0) {
      console.error('❌ Invalid files detected:', invalidFiles.map(f => ({ id: f.id, hasFile: !!f.file, isFile: f.file instanceof File, size: f.file?.size })));
      setDropboxError(`Invalid files detected: ${invalidFiles.length} files are corrupted or empty. Please reselect your files.`);
      return;
    }
    
    console.log('✅ All files validated successfully:', files.map(f => ({ name: f.file.name, size: f.file.size, type: f.file.type })));

    setIsUploading(true);
    setDropboxError(null);
    setUploadComplete(false);

    try {
      // Create folder first
      console.log('📂 Creating Dropbox folder...');
      const folderPath = await createDropboxFolder();
      
      console.log(`📁 Folder path result: "${folderPath}"`);
      console.log(`📁 Folder path type: ${typeof folderPath}`);

      // Prepare form data with enhanced debugging
      const formData = new FormData();
      
      // ✅ ENHANCED: Ensure we have a valid folder path
      const finalFolderPath = folderPath && folderPath !== 'undefined' ? folderPath : `/${folderName.replace(/[<>:"/\\|?*]/g, '_').trim() || 'uploads'}`;
      console.log(`📁 Final folder path: "${finalFolderPath}"`);
      
      formData.append('folderPath', finalFolderPath);
      formData.append('folder', finalFolderPath); // Add both for compatibility

      // Add all files to form data with detailed logging
      files.forEach((uploadFile, index) => {
        console.log(`📎 Adding file ${index}: ${uploadFile.file.name} (${uploadFile.file.size} bytes, ${uploadFile.file.type})`);
        formData.append(`file${index}`, uploadFile.file);
      });

      // Log form data contents for debugging
      console.log('📤 FormData contents:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      // Update file statuses
      setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })));

      console.log(`📤 Starting upload of ${files.length} files to server...`);

      console.log('🌐 Sending upload request to server...');
      
      // ✅ Enhanced debugging: Log FormData contents before sending
      console.log('📋 FormData contents:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  - ${key}: File "${value.name}" (${value.size} bytes, type: ${value.type || 'unknown'})`);
        } else {
          console.log(`  - ${key}: "${value}"`);
        }
      }
      
      // Verify we have the expected files
      const fileEntries = Array.from(formData.entries()).filter(([key]) => key.startsWith('file'));
      console.log(`📊 FormData contains ${fileEntries.length} file entries for ${files.length} selected files`);
      
      // ✅ ENHANCED: First test FormData debugging if available
      console.log('🐛 Testing FormData debug endpoint first...');
      try {
        const debugResponse = await safeFetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/debug-formdata`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            },
            body: formData,
            signal: AbortSignal.timeout(30000)
          }
        );
        console.log('🐛 FormData debug response:', debugResponse);
      } catch (debugError) {
        console.warn('🐛 FormData debug failed, continuing with upload:', debugError);
      }

      // ✅ ENHANCED: Try the enhanced endpoint with better error handling
      let response;
      let uploadEndpointUsed = '';
      try {
        console.log('🚀 Attempting enhanced upload endpoint...');
        uploadEndpointUsed = 'enhanced';
        response = await callDropboxEndpoint(
          `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/upload-batch-enhanced`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
              // Don't set Content-Type for FormData - browser will set it with boundary
            },
            body: formData,
            signal: AbortSignal.timeout(300000) // 5 minutes for large files
          },
          'Enhanced Dropbox Batch Upload (following Python patterns)'
        );
        
        console.log('✅ Enhanced endpoint succeeded');
      } catch (enhancedError) {
        console.warn('⚠️ Enhanced endpoint failed, trying original endpoint...');
        console.error('Enhanced endpoint error details:', enhancedError);
        
        // Check if the error looks like it's hitting the wrong endpoint
        if (enhancedError instanceof Error && enhancedError.message.includes('Google Sheets')) {
          console.error('🚨 CRITICAL: Request is being redirected to Google Sheets instead of Dropbox API!');
          console.error('🚨 This suggests a routing/proxy issue');
        }
        
        try {
          console.log('🔄 Attempting original upload endpoint...');
          uploadEndpointUsed = 'original';
          
          response = await callDropboxEndpoint(
            `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/upload-batch`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${publicAnonKey}`
                // Don't set Content-Type for FormData - browser will set it with boundary
              },
              body: formData,
              signal: AbortSignal.timeout(300000) // 5 minutes for large files
            },
            'Fallback Dropbox Batch Upload'
          );
          
          console.log('✅ Fallback endpoint succeeded');
        } catch (fallbackError) {
          console.error('❌ Both endpoints failed!');
          console.error('Enhanced error:', enhancedError);
          console.error('Fallback error:', fallbackError);
          
          // Throw the most informative error
          if (fallbackError instanceof Error && fallbackError.message.includes('Google Sheets')) {
            throw new Error('Upload system is misconfigured - requests are being redirected to Google Sheets instead of Dropbox. Please check server configuration.');
          }
          
          throw enhancedError; // Throw the first error
        }
      }
      
      console.log(`📊 Used ${uploadEndpointUsed} upload endpoint`);
      
      // ✅ CRITICAL FIX: Normalize the response to handle all edge cases
      const result = normalizeDropboxUploadResponse(response, files, folderName);
      
      console.log('📊 Normalized upload response:', JSON.stringify(result, null, 2));
      
      // ✅ SIMPLIFIED: Response is already normalized by the handler
      const hasSuccessfulUploads = result.successfulUploads > 0;
      const allUploadsFailed = result.successfulUploads === 0;
      
      console.log(`📊 Upload results: ${result.successfulUploads}/${result.totalFiles} successful (hasSuccessfulUploads: ${hasSuccessfulUploads})`);
      
      // ✅ Update file statuses based on normalized results
      setFiles(prev => prev.map(uploadFile => {
        const uploadResult = result.results.find(r => r.fileName === uploadFile.file.name);
        if (uploadResult) {
          console.log(`📄 File ${uploadFile.file.name}: ${uploadResult.success ? 'SUCCESS' : 'FAILED'}`, uploadResult.error || '');
          return {
            ...uploadFile,
            status: uploadResult.success ? 'success' : 'error',
            progress: 100,
            error: uploadResult.error,
            path: uploadResult.path
          };
        }
        // This shouldn't happen with normalized response, but handle gracefully
        console.warn(`⚠️ File ${uploadFile.file.name}: No result found - marking as successful`);
        return { ...uploadFile, status: 'success', progress: 100 };
      }));

      if (hasSuccessfulUploads) {
        setUploadComplete(true);
        
        // Generate share links or folder link
        const mediaLink = `https://dropbox.com/home${result.folderPath || folderPath}`;
        onUploadComplete(mediaLink);

        console.log(`✅ Upload completed successfully: ${result.successfulUploads}/${result.totalFiles} files uploaded`);
        
        // Show partial success message if some files failed
        if (result.failedUploads > 0) {
          setDropboxError(`Upload partially successful: ${result.successfulUploads}/${result.totalFiles} files uploaded. Some files failed - check individual file status above.`);
        }
      } else if (allUploadsFailed) {
        // All uploads failed - use the normalized error information
        console.error(`❌ All uploads failed: 0/${result.totalFiles} successful`);
        console.error('📊 Detailed failure analysis:', result);
        
        const errorMessage = result.errorSummary || 
          result.message || 
          `All ${result.totalFiles} file(s) failed to upload. Please check your Dropbox permissions and try again.`;
        
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('💥 Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setDropboxError(errorMessage);
      setShowErrorHandler(true);
      
      // Mark all files as failed
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'error' as const,
        error: errorMessage
      })));
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setFiles([]);
    setUploadComplete(false);
    setDropboxError(null);
    setShowErrorHandler(false);
    setTokenValid(false);
    setDropboxToken('');
  };

  const retryUpload = () => {
    setDropboxError(null);
    setShowErrorHandler(false);
    // Reset failed files to pending
    setFiles(prev => prev.map(f => f.status === 'error' ? { ...f, status: 'pending', error: undefined } : f));
  };

  // Emergency test upload function
  const testEmergencyUpload = async () => {
    if (files.length === 0 || !tokenValid) return;

    console.log('🚨 Starting emergency upload test...');
    setDropboxError(null);
    
    try {
      const formData = new FormData();
      const testFolder = `emergency-test-${Date.now()}`;
      formData.append('folderPath', testFolder);
      formData.append('folder', testFolder);

      // Add only first file for test
      const testFile = files[0];
      formData.append('file0', testFile.file);

      console.log(`🚨 Testing emergency upload for: ${testFile.file.name}`);

      const response = await safeFetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/upload-simple`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: formData,
          signal: AbortSignal.timeout(60000)
        }
      );

      if (response.success) {
        console.log('✅ Emergency upload test succeeded:', response.data);
        setDropboxError(`Emergency test successful! File uploaded to /${testFolder}. The main upload should work now.`);
      } else {
        console.error('❌ Emergency upload test failed:', response);
        setDropboxError(`Emergency test failed: ${response.error}. This helps identify the root cause.`);
      }
    } catch (error) {
      console.error('🚨 Emergency test error:', error);
      setDropboxError(`Emergency test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Media for {demoRequest.clientName}
        </CardTitle>
        <CardDescription>
          Upload photos and videos from the demo to Dropbox
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dropbox Token Section */}
        {!tokenValid && (
          <div className="space-y-4 p-4 border rounded-lg bg-amber-50">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <Label className="text-amber-800">Dropbox Access Token Required</Label>
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter your Dropbox access token"
                value={dropboxToken}
                onChange={(e) => setDropboxToken(e.target.value)}
                className="font-mono text-sm"
              />
              <Button 
                onClick={testDropboxToken}
                disabled={isTestingToken || !dropboxToken.trim()}
                size="sm"
              >
                {isTestingToken ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Token'
                )}
              </Button>
            </div>
            {dropboxError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{dropboxError}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {tokenValid && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Dropbox token validated successfully!</AlertDescription>
          </Alert>
        )}

        {/* Folder Name */}
        <div className="space-y-2">
          <Label htmlFor="folderName">Folder Name</Label>
          <Input
            id="folderName"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Enter folder name for the media"
            disabled={isUploading}
          />
        </div>

        {/* File Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Select Files</Label>
            <Input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              disabled={isUploading || !tokenValid}
              className="hidden"
              id="file-input"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-input')?.click()}
              disabled={isUploading || !tokenValid}
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
          </div>

          {/* Files List */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((uploadFile) => (
                <div key={uploadFile.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {getFileIcon(uploadFile.file.name)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {uploadFile.status === 'uploading' && (
                      <Progress value={uploadFile.progress} className="h-1 mt-1" />
                    )}
                    {uploadFile.error && (
                      <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        uploadFile.status === 'success' ? 'default' :
                        uploadFile.status === 'error' ? 'destructive' :
                        uploadFile.status === 'uploading' ? 'secondary' : 'outline'
                      }
                    >
                      {uploadFile.status === 'uploading' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      {uploadFile.status === 'success' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {uploadFile.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                      {uploadFile.status}
                    </Badge>
                    {!isUploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(uploadFile.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Display */}
        {dropboxError && !showErrorHandler && (
          <>
            <RoutingIssueAlert errorMessage={dropboxError} />
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{dropboxError}</AlertDescription>
            </Alert>
          </>
        )}

        {/* Enhanced Error Handler */}
        {showErrorHandler && dropboxError && (
          <UploadErrorHandler 
            error={dropboxError}
            onRetry={retryUpload}
            onDiagnose={() => setShowErrorHandler(false)}
          />
        )}

        {/* Quick Debug Access */}
        {dropboxError && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Having upload issues? Try the comprehensive debugger.</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open('?debug=dropbox', '_blank')}
              >
                Open Debugger
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Success Display */}
        {uploadComplete && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Files uploaded successfully to Dropbox!</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-between gap-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {uploadComplete && (
              <Button variant="outline" onClick={resetUpload}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Upload More
              </Button>
            )}
            <Button
              onClick={uploadFiles}
              disabled={files.length === 0 || isUploading || !tokenValid || uploadComplete}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {files.length} Files
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};