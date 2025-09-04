/**
 * Dropbox Upload Response Handler
 * 
 * Handles the specific case where Dropbox upload endpoints return 200 responses
 * that might have varying response structures or empty bodies.
 */

import { safeFetch, SafeHttpResponse } from './safeHttpResponseHandler';

export interface DropboxUploadResult {
  fileName: string;
  success: boolean;
  error?: string;
  path?: string;
  size?: number;
}

export interface DropboxBatchUploadResponse {
  success: boolean;
  totalFiles: number;
  successfulUploads: number;
  failedUploads: number;
  results: DropboxUploadResult[];
  folderPath?: string;
  errorSummary?: string;
  message?: string;
}

/**
 * Safely handles Dropbox batch upload responses with proper fallbacks
 */
export function normalizeDropboxUploadResponse(
  response: SafeHttpResponse<any>, 
  files: File[], 
  folderName: string
): DropboxBatchUploadResponse {
  
  console.log('🔍 Normalizing Dropbox upload response:', {
    responseSuccess: response.success,
    hasData: !!response.data,
    status: response.status,
    statusText: response.statusText,
    dataKeys: response.data ? Object.keys(response.data) : null,
    originalFilesCount: files.length
  });
  
  // ✅ CRITICAL FIX: Don't assume 200 with no data means success
  // This was causing false positives where uploads were failing but being marked as successful
  if (response.success && !response.data) {
    console.warn('⚠️ HTTP 200 success with no response body - this is actually suspicious!');
    console.warn('⚠️ Treating as FAILED upload since we have no confirmation of success');
    return {
      success: false,
      totalFiles: files.length,
      successfulUploads: 0,
      failedUploads: files.length,
      results: files.map(file => ({
        fileName: file.name,
        success: false,
        error: 'Server returned 200 OK but no response data - upload status unknown'
      })),
      errorSummary: 'Server responded with HTTP 200 but provided no upload results - this suggests a server-side issue',
      message: 'Upload failed: Server gave empty response despite HTTP 200 status'
    };
  }

  // If response failed, return error structure
  if (!response.success) {
    return {
      success: false,
      totalFiles: files.length,
      successfulUploads: 0,
      failedUploads: files.length,
      results: files.map(file => ({
        fileName: file.name,
        success: false,
        error: response.error || 'Upload failed'
      })),
      errorSummary: response.error || 'All uploads failed',
      message: `Upload failed: ${response.error}`
    };
  }

  // We have successful response with data - normalize it
  const data = response.data;
  
  // Ensure required fields exist
  const normalizedResponse: DropboxBatchUploadResponse = {
    success: data.success !== false, // Default to true unless explicitly false
    totalFiles: data.totalFiles || files.length,
    successfulUploads: data.successfulUploads || 0,
    failedUploads: data.failedUploads || 0,
    results: data.results || [],
    folderPath: data.folderPath || `/${folderName}`,
    errorSummary: data.errorSummary,
    message: data.message
  };

  // If no results array but we have a successful response, create results
  if (normalizedResponse.results.length === 0 && normalizedResponse.success) {
    console.log('⚠️ Creating results array from file list (missing from server response)');
    normalizedResponse.results = files.map(file => ({
      fileName: file.name,
      success: true,
      path: `/${folderName}/${file.name}`,
      size: file.size
    }));
    normalizedResponse.successfulUploads = files.length;
    normalizedResponse.failedUploads = 0;
  }

  // Calculate counts if missing
  if (normalizedResponse.results.length > 0) {
    const actualSuccessful = normalizedResponse.results.filter(r => r.success).length;
    const actualFailed = normalizedResponse.results.filter(r => !r.success).length;
    
    // Use actual counts if they differ from reported counts
    if (normalizedResponse.successfulUploads !== actualSuccessful) {
      console.log(`⚠️ Correcting successfulUploads: reported ${normalizedResponse.successfulUploads}, actual ${actualSuccessful}`);
      normalizedResponse.successfulUploads = actualSuccessful;
    }
    
    if (normalizedResponse.failedUploads !== actualFailed) {
      console.log(`⚠️ Correcting failedUploads: reported ${normalizedResponse.failedUploads}, actual ${actualFailed}`);
      normalizedResponse.failedUploads = actualFailed;
    }
  }

  // Ensure success flag matches the actual results
  const hasAnySuccessful = normalizedResponse.successfulUploads > 0;
  if (normalizedResponse.success && !hasAnySuccessful) {
    console.log('⚠️ Response marked as successful but no files were uploaded successfully');
    normalizedResponse.success = false;
    normalizedResponse.errorSummary = 'No files were uploaded successfully despite successful server response';
  }

  return normalizedResponse;
}

/**
 * Handles Dropbox API calls with proper error handling and response normalization
 */
export async function callDropboxEndpoint<T = any>(
  url: string, 
  options: RequestInit,
  operation: string = 'Dropbox API call'
): Promise<SafeHttpResponse<T>> {
  
  console.log(`🔗 ${operation} - calling ${url}`);
  
  try {
    const response = await safeFetch<T>(url, options);
    
    if (response.success) {
      console.log(`✅ ${operation} - HTTP ${response.status} SUCCESS`);
    } else {
      console.error(`❌ ${operation} - HTTP ${response.status} ERROR: ${response.error}`);
    }
    
    return response;
  } catch (error) {
    console.error(`💥 ${operation} - Network/Request error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
      status: 0,
      statusText: 'Network Error',
      hasJsonBody: false
    };
  }
}