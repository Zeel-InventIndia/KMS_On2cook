import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertCircle, CheckCircle, Upload, Folder, TestTube, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { callDropboxEndpoint } from '../utils/dropboxUploadHandler';

interface UploadDebugStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  details?: string;
  timestamp?: string;
}

export function DropboxUploadDebugger() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [folderName, setFolderName] = useState(`debug-test-${Date.now()}`);
  const [debugSteps, setDebugSteps] = useState<UploadDebugStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [detailedLogs, setDetailedLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    setDetailedLogs(prev => [...prev, logEntry]);
    console.log(logEntry);
  };

  const updateStep = (index: number, status: UploadDebugStep['status'], details?: string) => {
    setDebugSteps(prev => prev.map((step, i) => 
      i === index 
        ? { ...step, status, details, timestamp: new Date().toISOString() }
        : step
    ));
  };

  const initializeDebugSteps = () => {
    const steps: UploadDebugStep[] = [
      { name: 'Health Check', status: 'pending' },
      { name: 'Token Validation', status: 'pending' },
      { name: 'Simple Upload Test', status: 'pending' },
      { name: 'Folder Creation', status: 'pending' },
      { name: 'FormData Preparation', status: 'pending' },
      { name: 'File Upload', status: 'pending' },
      { name: 'Response Validation', status: 'pending' }
    ];
    setDebugSteps(steps);
    setDetailedLogs([]);
    addLog('🚀 Starting comprehensive Dropbox upload debug session');
  };

  const runHealthCheck = async () => {
    updateStep(0, 'running');
    addLog('🏥 Running health check...');
    
    try {
      const response = await callDropboxEndpoint(
        `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        },
        'Health Check'
      );

      if (response.success && response.data) {
        const env = response.data.environment;
        addLog(`✅ Health check passed - Dropbox token: ${env.hasDropboxToken ? 'Present' : 'Missing'} (${env.dropboxTokenLength} chars)`);
        updateStep(0, 'success', `Token: ${env.hasDropboxToken ? 'Present' : 'Missing'} (${env.dropboxTokenLength} chars)`);
        return true;
      } else {
        addLog(`❌ Health check failed: ${response.error}`);
        updateStep(0, 'error', response.error);
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`💥 Health check error: ${errorMsg}`);
      updateStep(0, 'error', errorMsg);
      return false;
    }
  };

  const runTokenValidation = async () => {
    updateStep(1, 'running');
    addLog('🔑 Validating Dropbox token...');
    
    try {
      const response = await callDropboxEndpoint(
        `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/self-test`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        },
        'Token Validation'
      );

      if (response.success && response.data?.dropboxConnected) {
        const account = response.data.accountInfo;
        addLog(`✅ Token validation passed - Account: ${account?.name || 'Unknown'} (${account?.email || 'No email'})`);
        updateStep(1, 'success', `Account: ${account?.name || 'Unknown'}`);
        return true;
      } else {
        addLog(`❌ Token validation failed: ${response.error || 'Token not connected'}`);
        updateStep(1, 'error', response.error || 'Token not connected');
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`💥 Token validation error: ${errorMsg}`);
      updateStep(1, 'error', errorMsg);
      return false;
    }
  };

  const runSimpleUploadTest = async () => {
    updateStep(2, 'running');
    addLog('🧪 Testing simple Dropbox upload with test file...');
    
    try {
      const response = await callDropboxEndpoint(
        `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/test-upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        },
        'Simple Upload Test'
      );

      if (response.success && response.data) {
        addLog(`✅ Simple upload test passed: ${response.data.filePath} (${response.data.fileSize} bytes)`);
        updateStep(2, 'success', `Test file: ${response.data.filePath}`);
        return true;
      } else {
        addLog(`❌ Simple upload test failed: ${response.error}`);
        updateStep(2, 'error', response.error);
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`💥 Simple upload test error: ${errorMsg}`);
      updateStep(2, 'error', errorMsg);
      return false;
    }
  };

  const runFolderCreation = async () => {
    updateStep(3, 'running');
    addLog(`📂 Creating folder: ${folderName}`);
    
    try {
      const response = await callDropboxEndpoint(
        `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/create-folder`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ folderName })
        },
        'Folder Creation'
      );

      if (response.success && response.data) {
        const folderPath = response.data.path;
        const alreadyExists = response.data.alreadyExists;
        addLog(`✅ Folder creation ${alreadyExists ? '(already exists)' : 'successful'}: ${folderPath}`);
        updateStep(3, 'success', `Path: ${folderPath} ${alreadyExists ? '(existed)' : '(created)'}`);
        return folderPath;
      } else {
        addLog(`❌ Folder creation failed: ${response.error}`);
        updateStep(3, 'error', response.error);
        return null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`💥 Folder creation error: ${errorMsg}`);
      updateStep(3, 'error', errorMsg);
      return null;
    }
  };

  const runFormDataPreparation = async (folderPath: string) => {
    updateStep(4, 'running');
    addLog('📋 Preparing FormData...');
    
    try {
      const formData = new FormData();
      formData.append('folderPath', folderPath);
      
      selectedFiles.forEach((file, index) => {
        formData.append(`file${index}`, file);
        addLog(`📎 Added file ${index + 1}: ${file.name} (${(file.size / 1024).toFixed(2)} KB, ${file.type || 'unknown type'})`);
      });

      // Validate FormData
      const entries = Array.from(formData.entries());
      addLog(`📊 FormData contains ${entries.length} entries:`);
      entries.forEach(([key, value]) => {
        if (value instanceof File) {
          addLog(`  - ${key}: File "${value.name}" (${value.size} bytes)`);
        } else {
          addLog(`  - ${key}: "${value}"`);
        }
      });

      updateStep(4, 'success', `${selectedFiles.length} files prepared`);
      return formData;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`💥 FormData preparation error: ${errorMsg}`);
      updateStep(4, 'error', errorMsg);
      return null;
    }
  };

  const runFileUpload = async (formData: FormData) => {
    updateStep(5, 'running');
    addLog('📤 Starting file upload...');
    
    try {
      // Pre-upload validation: Check file sizes and types
      const files = selectedFiles;
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const avgSize = totalSize / files.length;
      
      addLog(`📊 Upload Analysis:`);
      addLog(`  - Total files: ${files.length}`);
      addLog(`  - Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      addLog(`  - Average size: ${(avgSize / 1024).toFixed(2)} KB`);
      addLog(`  - Largest file: ${(Math.max(...files.map(f => f.size)) / 1024).toFixed(2)} KB`);
      
      // Check for potentially problematic files
      const emptyFiles = files.filter(f => f.size === 0);
      const largeFiles = files.filter(f => f.size > 150 * 1024 * 1024); // 150MB+
      const noExtFiles = files.filter(f => !f.name.includes('.'));
      
      if (emptyFiles.length > 0) {
        addLog(`⚠️ Warning: ${emptyFiles.length} empty files detected`);
      }
      if (largeFiles.length > 0) {
        addLog(`⚠️ Warning: ${largeFiles.length} very large files (>150MB) detected`);
      }
      if (noExtFiles.length > 0) {
        addLog(`⚠️ Warning: ${noExtFiles.length} files without extensions detected`);
      }
      
      // Note: Can't use callDropboxEndpoint here because it doesn't support FormData properly
      addLog('🌐 Making direct fetch request to upload endpoint...');
      
      // Test both endpoints for comparison
      const uploadUrl = `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/upload-batch-enhanced`;
      addLog(`📡 Upload URL (Enhanced): ${uploadUrl}`);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: formData,
        signal: AbortSignal.timeout(120000) // 2 minutes for debug
      });

      addLog(`📡 Server responded with: ${response.status} ${response.statusText}`);
      addLog(`📊 Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);

      // Clone response before reading to avoid consumption issues
      const responseClone = response.clone();

      let responseData;
      let hasJsonBody = false;
      
      try {
        responseData = await response.json();
        hasJsonBody = true;
        addLog(`📄 Response JSON: ${JSON.stringify(responseData, null, 2)}`);
      } catch (jsonError) {
        addLog(`⚠️ Response is not JSON, trying text...`);
        try {
          const textData = await responseClone.text();
          responseData = { rawText: textData };
          addLog(`📄 Response text: ${textData.substring(0, 500)}${textData.length > 500 ? '...' : ''}`);
        } catch (textError) {
          addLog(`💥 Could not read response as text either: ${textError}`);
          responseData = { error: 'Could not read response body' };
        }
      }

      if (response.ok && hasJsonBody && responseData) {
        const successCount = responseData.successfulUploads || 0;
        const totalCount = responseData.totalFiles || selectedFiles.length;
        
        // Enhanced debugging for 200 responses that might still indicate failures
        if (successCount === 0 && totalCount > 0) {
          addLog(`⚠️ HTTP 200 received but NO FILES UPLOADED successfully!`);
          addLog(`📊 Response indicates: ${successCount}/${totalCount} files successful`);
          
          // Log detailed failure analysis
          if (responseData.results && Array.isArray(responseData.results)) {
            addLog(`📋 Individual file results (${responseData.results.length} entries):`);
            responseData.results.forEach((result: any, index: number) => {
              addLog(`  ${index + 1}. ${result.fileName}: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.error || result.path || 'No details'}`);
            });
          } else {
            addLog(`❌ No results array found in response`);
          }
          
          // Log error summary
          if (responseData.errorSummary) {
            addLog(`🔍 Error Summary: ${responseData.errorSummary}`);
          }
          
          // Log debug info if available
          if (responseData.debug) {
            addLog(`🔍 Debug Info: ${JSON.stringify(responseData.debug, null, 2)}`);
          }
          
          updateStep(5, 'error', `HTTP 200 but 0/${totalCount} files uploaded - see logs for details`);
          return responseData; // Return the data so we can analyze it further
        }
        
        addLog(`✅ Upload completed: ${successCount}/${totalCount} files successful`);
        
        if (responseData.results) {
          responseData.results.forEach((result: any) => {
            if (result.success) {
              addLog(`  ✅ ${result.fileName}: ${result.path} (${result.size} bytes)`);
            } else {
              addLog(`  ❌ ${result.fileName}: ${result.error}`);
            }
          });
        }
        
        updateStep(5, 'success', `${successCount}/${totalCount} files uploaded`);
        return responseData;
      } else {
        const errorMsg = responseData?.error || responseData?.details || `HTTP ${response.status}`;
        addLog(`❌ Upload failed: ${errorMsg}`);
        updateStep(5, 'error', errorMsg);
        return null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`💥 Upload error: ${errorMsg}`);
      updateStep(5, 'error', errorMsg);
      return null;
    }
  };

  const runResponseValidation = (uploadResponse: any) => {
    updateStep(6, 'running');
    addLog('🔍 Validating upload response...');
    
    try {
      const validationIssues = [];
      
      if (!uploadResponse) {
        validationIssues.push('Response is null or undefined');
      }
      
      if (uploadResponse && typeof uploadResponse.success === 'undefined') {
        validationIssues.push('Missing success field');
      }
      
      if (uploadResponse && typeof uploadResponse.totalFiles === 'undefined') {
        validationIssues.push('Missing totalFiles field');
      }
      
      if (uploadResponse && typeof uploadResponse.successfulUploads === 'undefined') {
        validationIssues.push('Missing successfulUploads field');
      }
      
      if (uploadResponse && !Array.isArray(uploadResponse.results)) {
        validationIssues.push('Missing or invalid results array');
      }

      if (validationIssues.length === 0) {
        addLog('✅ Response structure is valid');
        updateStep(6, 'success', 'Response structure valid');
      } else {
        const issuesStr = validationIssues.join(', ');
        addLog(`⚠️ Response validation issues: ${issuesStr}`);
        updateStep(6, 'error', issuesStr);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`💥 Response validation error: ${errorMsg}`);
      updateStep(6, 'error', errorMsg);
    }
  };

  const runFullDiagnostic = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file for the diagnostic test');
      return;
    }

    setIsRunning(true);
    initializeDebugSteps();
    
    try {
      // Step 1: Health Check
      const healthOk = await runHealthCheck();
      if (!healthOk) return;

      // Step 2: Token Validation
      const tokenOk = await runTokenValidation();
      if (!tokenOk) return;

      // Step 3: Simple Upload Test
      const simpleUploadOk = await runSimpleUploadTest();
      if (!simpleUploadOk) {
        addLog('❌ Simple upload test failed - this indicates a fundamental issue with Dropbox API connectivity');
        return;
      }

      // Step 4: Folder Creation
      const folderPath = await runFolderCreation();
      if (!folderPath) return;

      // Step 5: FormData Preparation
      const formData = await runFormDataPreparation(folderPath);
      if (!formData) return;

      // Step 6: File Upload
      const uploadResponse = await runFileUpload(formData);

      // Step 7: Response Validation
      runResponseValidation(uploadResponse);

      addLog('🎉 Diagnostic complete! Check the results above for any issues.');
    } catch (error) {
      addLog(`💥 Diagnostic failed with unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStepIcon = (status: UploadDebugStep['status']) => {
    switch (status) {
      case 'running': return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getStepBadgeVariant = (status: UploadDebugStep['status']) => {
    switch (status) {
      case 'running': return 'default';
      case 'success': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Dropbox Upload Debugger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This tool performs a comprehensive test of the Dropbox upload system to identify 
              exactly where failures occur. It will test each step individually and provide 
              detailed logging.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block">Test Folder Name:</label>
              <Input 
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="debug-test-folder"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block">Test Files:</label>
              <Input 
                type="file"
                multiple
                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
              />
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <h4>Selected Files:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, index) => (
                  <Badge key={index} variant="outline">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button 
            onClick={runFullDiagnostic} 
            disabled={isRunning || selectedFiles.length === 0}
            className="w-full"
          >
            {isRunning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Running Diagnostic...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Run Full Upload Diagnostic
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {debugSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="steps" className="w-full">
              <TabsList>
                <TabsTrigger value="steps">Step Results</TabsTrigger>
                <TabsTrigger value="logs">Detailed Logs</TabsTrigger>
              </TabsList>
              
              <TabsContent value="steps" className="space-y-3">
                {debugSteps.map((step, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded">
                    {getStepIcon(step.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{step.name}</span>
                        <Badge variant={getStepBadgeVariant(step.status)}>
                          {step.status}
                        </Badge>
                      </div>
                      {step.details && (
                        <p className="text-sm text-muted-foreground mt-1">{step.details}</p>
                      )}
                      {step.timestamp && (
                        <p className="text-xs text-muted-foreground">{step.timestamp}</p>
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="logs">
                <Textarea 
                  className="min-h-[400px] font-mono text-sm"
                  value={detailedLogs.join('\n')}
                  readOnly
                  placeholder="Detailed logs will appear here during the diagnostic..."
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}