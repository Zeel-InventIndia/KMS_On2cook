/**
 * Safe HTTP Response Handler Utility
 * 
 * Addresses the critical issue where HTTP 200 responses were being treated as errors
 * because response.json() fails when the body is empty or non-JSON, and then the 
 * fallback tries to read the body again (which fails because it's already consumed).
 * 
 * This handler properly clones responses before reading and handles all edge cases.
 */

export interface SafeHttpResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
  statusText: string;
  hasJsonBody: boolean;
  bodyText?: string;
}

/**
 * Safely handles HTTP responses by cloning before reading, avoiding body consumption issues
 */
export async function handleResponseSafely<T = any>(response: Response): Promise<SafeHttpResponse<T>> {
  const result: SafeHttpResponse<T> = {
    success: false,
    status: response.status,
    statusText: response.statusText,
    hasJsonBody: false
  };

  // ✅ CRITICAL FIX: Clone the response before any body reading attempts
  const responseClone = response.clone();
  
  console.log(`📡 Processing HTTP ${response.status} response from ${response.url}`);

  // ✅ For all 2xx status codes, treat as success (this includes 200)
  if (response.status >= 200 && response.status < 300) {
    result.success = true;
    
    // Try to read as JSON first
    try {
      const jsonData = await response.json();
      result.data = jsonData;
      result.hasJsonBody = true;
      console.log(`✅ HTTP ${response.status} SUCCESS with JSON body:`, jsonData);
      return result;
    } catch (jsonError) {
      console.log(`✅ HTTP ${response.status} SUCCESS - JSON parsing failed, trying text...`);
      
      // If JSON parsing fails, try reading as text using the clone
      try {
        const textData = await responseClone.text();
        result.bodyText = textData;
        result.hasJsonBody = false;
        
        if (textData.trim().length === 0) {
          console.log(`✅ HTTP ${response.status} SUCCESS with empty body`);
        } else {
          console.log(`✅ HTTP ${response.status} SUCCESS with text body:`, textData.substring(0, 100));
        }
        return result;
      } catch (textError) {
        console.log(`✅ HTTP ${response.status} SUCCESS - unable to read body, but status indicates success`);
        // Even if we can't read the body, 2xx status means success
        return result;
      }
    }
  }

  // ✅ For non-success status codes (4xx, 5xx), try to get error details
  result.success = false;
  
  try {
    const errorJson = await response.json();
    result.error = errorJson.error || errorJson.message || errorJson.details || `HTTP ${response.status}: ${response.statusText}`;
    result.data = errorJson;
    result.hasJsonBody = true;
    console.error(`❌ HTTP ${response.status} ERROR with JSON:`, errorJson);
  } catch (jsonError) {
    // Try to read error as text using clone
    try {
      const errorText = await responseClone.text();
      result.error = errorText.trim() || `HTTP ${response.status}: ${response.statusText}`;
      result.bodyText = errorText;
      result.hasJsonBody = false;
      console.error(`❌ HTTP ${response.status} ERROR with text:`, errorText);
    } catch (textError) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      console.error(`❌ HTTP ${response.status} ERROR - unable to read error details`);
    }
  }

  return result;
}

/**
 * Wrapper for fetch that uses safe response handling
 */
export async function safeFetch<T = any>(url: string, options?: RequestInit): Promise<SafeHttpResponse<T>> {
  try {
    console.log(`🌐 Making ${options?.method || 'GET'} request to:`, url);
    const response = await fetch(url, options);
    return await handleResponseSafely<T>(response);
  } catch (networkError) {
    console.error(`🌐 Network error for ${url}:`, networkError);
    return {
      success: false,
      error: networkError instanceof Error ? networkError.message : 'Network request failed',
      status: 0,
      statusText: 'Network Error',
      hasJsonBody: false
    };
  }
}

/**
 * Helper to extract success data or throw error
 */
export function getDataOrThrow<T>(response: SafeHttpResponse<T>): T {
  if (!response.success) {
    throw new Error(response.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.data as T;
}

/**
 * Helper to check if response has usable data
 */
export function hasUsableData<T>(response: SafeHttpResponse<T>): boolean {
  return response.success && (response.hasJsonBody || (response.bodyText && response.bodyText.trim().length > 0));
}