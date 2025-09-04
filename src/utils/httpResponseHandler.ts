/**
 * HTTP Response Handler Utility
 * 
 * This utility ensures that HTTP 200 responses are ALWAYS treated as successful operations,
 * not as "unexpected responses" or errors. This addresses the issue where some parts of the
 * application were incorrectly treating 200 status codes as warnings.
 */

export interface HttpResponseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
  statusText: string;
}

/**
 * Properly handles HTTP responses, ensuring 200 status codes are treated as success
 */
export async function handleHttpResponse<T = any>(response: Response): Promise<HttpResponseResult<T>> {
  const result: HttpResponseResult<T> = {
    success: false,
    status: response.status,
    statusText: response.statusText
  };

  // ✅ CRITICAL: HTTP 200 status codes are SUCCESS, not "unexpected responses"!
  if (response.status === 200) {
    try {
      const data = await response.json();
      console.log(`✅ HTTP 200 Success Response:`, {
        url: response.url,
        status: response.status,
        data: data
      });
      
      result.success = true;
      result.data = data;
      return result;
    } catch (jsonError) {
      // Even if JSON parsing fails, 200 status is still success
      console.log(`✅ HTTP 200 Success (non-JSON response):`, {
        url: response.url,
        status: response.status
      });
      
      result.success = true;
      result.data = undefined;
      return result;
    }
  }

  // Handle other status codes
  if (response.ok) {
    // Other 2xx status codes are also success
    try {
      const data = await response.json();
      result.success = true;
      result.data = data;
    } catch (jsonError) {
      result.success = true;
      result.data = undefined;
    }
  } else {
    // Non-success status codes
    try {
      const errorData = await response.json();
      result.error = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
    } catch (jsonError) {
      try {
        const errorText = await response.text();
        result.error = errorText || `HTTP ${response.status}: ${response.statusText}`;
      } catch (textError) {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }
    }
  }

  return result;
}

/**
 * Console logger that properly identifies successful HTTP responses
 */
export function logHttpResponse(url: string, status: number, operation: string) {
  if (status === 200) {
    console.log(`✅ ${operation} - HTTP 200 SUCCESS for ${url}`);
  } else if (status >= 200 && status < 300) {
    console.log(`✅ ${operation} - HTTP ${status} SUCCESS for ${url}`);
  } else {
    console.error(`❌ ${operation} - HTTP ${status} ERROR for ${url}`);
  }
}

/**
 * Validates that a response should be treated as successful
 */
export function isSuccessResponse(response: Response): boolean {
  // ✅ IMPORTANT: 200 and all 2xx status codes are success
  return response.status >= 200 && response.status < 300;
}

/**
 * Helper to avoid "Unexpected response: 200" warnings
 */
export function getResponseStatusMessage(status: number): string {
  if (status === 200) {
    return '✅ HTTP 200 - Success! Operation completed successfully.';
  } else if (status >= 200 && status < 300) {
    return `✅ HTTP ${status} - Success! Operation completed successfully.`;
  } else if (status >= 400 && status < 500) {
    return `❌ HTTP ${status} - Client Error: Request needs to be modified.`;
  } else if (status >= 500) {
    return `❌ HTTP ${status} - Server Error: Server encountered an issue.`;
  } else {
    return `ℹ️ HTTP ${status} - Informational or redirection response.`;
  }
}