// Google Sheets Service Account Integration - Fixed Implementation
// This provides secure, long-lived access to private Google Sheets

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

class GoogleSheetsServiceAccountFixed {
  private credentials: ServiceAccountCredentials | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor() {
    this.initializeCredentials();
  }

  private initializeCredentials() {
    const credentialsJson = Deno.env.get('GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON');
    if (credentialsJson) {
      try {
        this.credentials = JSON.parse(credentialsJson);
        console.log('✅ Service Account credentials loaded successfully:', {
          email: this.credentials.client_email,
          project: this.credentials.project_id,
          hasPrivateKey: !!this.credentials.private_key,
          privateKeyLength: this.credentials.private_key?.length || 0
        });
      } catch (error) {
        console.error('❌ Failed to parse service account credentials:', error);
        throw new Error('Invalid GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON format. Please ensure it contains valid JSON.');
      }
    } else {
      console.warn('⚠️ GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON not found. Falling back to public CSV access.');
    }
  }

  async getAccessToken(): Promise<string> {
    if (!this.credentials) {
      throw new Error('Service account credentials not configured');
    }

    // Check if current token is still valid (with 5 min buffer)
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 300000) {
      console.log('♻️ Using cached access token');
      return this.accessToken;
    }

    try {
      console.log('🔐 Creating new JWT for service account authentication...');
      
      // Validate credentials before creating JWT
      const validation = this.validateServiceAccountConfiguration();
      if (!validation.valid) {
        throw new Error(`Service account validation failed: ${validation.error}`);
      }
      
      // Create JWT for service account authentication
      const jwt = await this.createJWT();
      console.log('🔐 JWT created successfully, length:', jwt.length);
      
      // Exchange JWT for access token
      console.log('🔐 Exchanging JWT for access token...');
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('❌ Token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          body: errorText
        });
        
        // Enhanced error messaging
        if (errorText.includes('invalid_grant')) {
          if (errorText.includes('Invalid JWT Signature')) {
            throw new Error('JWT signature validation failed. This usually indicates an issue with the service account private key format or content. Please regenerate your service account JSON.');
          } else {
            throw new Error('JWT grant invalid. Please check service account credentials and ensure the service account has proper permissions.');
          }
        }
        
        throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      this.accessToken = tokenData.access_token;
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
      
      console.log('✅ Service account access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('💥 Service account authentication failed:', error);
      
      // Clear cached token on failure
      this.accessToken = null;
      this.tokenExpiry = null;
      
      throw error;
    }
  }

  private async createJWT(): Promise<string> {
    if (!this.credentials) {
      throw new Error('Service account credentials not configured');
    }

    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    const payload = {
      iss: this.credentials.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: this.credentials.token_uri,
      exp: now + 3600, // 1 hour
      iat: now,
    };

    console.log('🔐 JWT payload:', {
      iss: payload.iss,
      scope: payload.scope,
      aud: payload.aud,
      exp: payload.exp,
      iat: payload.iat
    });

    // Base64URL encode header and payload
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    
    // Create signature
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    console.log('🔐 Signing input length:', signingInput.length);
    
    const signatureBuffer = await this.signWithRS256(signingInput, this.credentials.private_key);
    const encodedSignature = this.base64UrlEncode(signatureBuffer);

    const jwt = `${signingInput}.${encodedSignature}`;
    console.log('🔐 JWT created, total length:', jwt.length);
    
    return jwt;
  }

  private base64UrlEncode(data: string | ArrayBuffer): string {
    let base64: string;
    
    if (typeof data === 'string') {
      // For string data, use btoa directly
      base64 = btoa(unescape(encodeURIComponent(data))); // Handle UTF-8 properly
    } else {
      // For ArrayBuffer data, convert to binary string then base64
      const bytes = new Uint8Array(data);
      let binaryString = '';
      for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      base64 = btoa(binaryString);
    }
    
    // Convert to base64url format
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private async signWithRS256(data: string, privateKey: string): Promise<ArrayBuffer> {
    try {
      console.log('🔐 Starting JWT signing process...');
      
      // Enhanced private key cleaning - handle escaped newlines and various formats
      let cleanKey = privateKey;
      
      // Handle escaped newlines in JSON strings (common issue)
      if (cleanKey.includes('\\n')) {
        cleanKey = cleanKey.replace(/\\n/g, '\n');
        console.log('🔐 Converted escaped newlines in private key');
      }
      
      // Remove PEM headers/footers and all whitespace
      cleanKey = cleanKey
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
        .replace(/-----END RSA PRIVATE KEY-----/g, '')
        .replace(/\r/g, '')
        .replace(/\n/g, '')
        .replace(/\s/g, '');

      console.log('🔐 Private key cleaned, length:', cleanKey.length);

      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanKey)) {
        console.error('❌ Invalid base64 format in private key');
        throw new Error('Private key is not valid base64 format');
      }

      // Decode the base64 private key with robust error handling
      let keyData: Uint8Array;
      try {
        const binaryString = atob(cleanKey);
        keyData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          keyData[i] = binaryString.charCodeAt(i);
        }
        console.log('🔐 Private key decoded successfully, buffer length:', keyData.length);
      } catch (decodeError) {
        console.error('❌ Private key base64 decode failed:', decodeError);
        throw new Error('Failed to decode private key base64 data. Please verify the private key format in the service account JSON.');
      }
      
      // Import the private key with better error handling
      let cryptoKey: CryptoKey;
      try {
        cryptoKey = await crypto.subtle.importKey(
          'pkcs8',
          keyData.buffer,
          {
            name: 'RSASSA-PKCS1-v1_5',
            hash: 'SHA-256',
          },
          false,
          ['sign']
        );
        console.log('🔐 Private key imported successfully');
      } catch (importError) {
        console.error('❌ Private key import failed:', importError);
        throw new Error(`Failed to import private key: ${importError instanceof Error ? importError.message : 'Unknown error'}. Please ensure the service account private key is in PKCS#8 format.`);
      }

      // Sign the data
      const encoder = new TextEncoder();
      const dataToSign = encoder.encode(data);
      
      let signature: ArrayBuffer;
      try {
        signature = await crypto.subtle.sign(
          'RSASSA-PKCS1-v1_5',
          cryptoKey,
          dataToSign
        );
        console.log('🔐 Data signed successfully, signature length:', signature.byteLength);
      } catch (signError) {
        console.error('❌ Data signing failed:', signError);
        throw new Error(`Failed to sign data: ${signError instanceof Error ? signError.message : 'Unknown error'}`);
      }

      return signature;
      
    } catch (error) {
      console.error('💥 JWT signing error:', error);
      throw new Error(`JWT signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async fetchSheetData(spreadsheetId: string, range: string): Promise<any[]> {
    console.log('🔍 fetchSheetData called with:', {
      spreadsheetId,
      range,
      hasCredentials: !!this.credentials,
      credentialsEmail: this.credentials?.client_email
    });
    
    if (!spreadsheetId || spreadsheetId.trim() === '') {
      throw new Error('Spreadsheet ID is required but was not provided to fetchSheetData');
    }
    
    if (!this.credentials) {
      throw new Error('Service account credentials are required for Google Sheets operations. Please configure GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON environment variable.');
    }
    
    try {
      console.log('🔐 Using Service Account authentication for Google Sheets');
      return await this.fetchWithServiceAccount(spreadsheetId, range);
    } catch (error) {
      console.error('💥 Service Account authentication failed:', error);
      throw error;
    }
  }

  private async fetchWithServiceAccount(spreadsheetId: string, range: string): Promise<any[]> {
    const accessToken = await this.getAccessToken();
    
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    console.log('📊 Fetching from Google Sheets API:', apiUrl);
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Sheets API error with service account (${response.status}):`, errorText);
        
        if (response.status === 403) {
          throw new Error('Sheets API access forbidden. Please ensure the service account has access to the spreadsheet or add the service account email as a viewer.');
        } else if (response.status === 404) {
          throw new Error('Spreadsheet or range not found. Please verify the spreadsheet ID and range.');
        }
        
        throw new Error(`Sheets API request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Successfully fetched sheet data via service account, rows:', data.values?.length || 0);
      return data.values || [];
    } catch (error) {
      console.error('💥 Error fetching sheet data with service account:', error);
      throw error;
    }
  }

  getServiceAccountEmail(): string | null {
    return this.credentials?.client_email || null;
  }

  isServiceAccountConfigured(): boolean {
    return this.credentials !== null && 
           this.credentials.client_email !== undefined && 
           this.credentials.private_key !== undefined;
  }

  /**
   * Validate that service account is properly configured for Google Sheets operations
   */
  validateServiceAccountConfiguration(): { valid: boolean; error?: string; details?: any } {
    if (!this.credentials) {
      return {
        valid: false,
        error: 'Service account credentials not found. Please set GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON environment variable.'
      };
    }

    const requiredFields = ['client_email', 'private_key', 'project_id', 'token_uri'];
    const missingFields = requiredFields.filter(field => !this.credentials![field]);
    
    if (missingFields.length > 0) {
      return {
        valid: false,
        error: `Service account credentials missing required fields: ${missingFields.join(', ')}`,
        details: {
          missingFields,
          providedFields: Object.keys(this.credentials || {})
        }
      };
    }

    // Enhanced private key validation
    const privateKey = this.credentials.private_key;
    if (!privateKey.includes('BEGIN PRIVATE KEY') && !privateKey.includes('BEGIN RSA PRIVATE KEY')) {
      return {
        valid: false,
        error: 'Service account private key appears to be invalid or malformed. It should contain PEM headers.',
        details: {
          keyLength: privateKey.length,
          startsWithDashes: privateKey.startsWith('-----'),
          hasBeginMarker: privateKey.includes('BEGIN')
        }
      };
    }

    // Check for common JSON escape issues
    if (privateKey.includes('\\n') && !privateKey.includes('\n')) {
      console.log('🔐 Private key has escaped newlines (\\n) - this is normal in JSON format');
    }

    return { valid: true };
  }

  async updateSheetData(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    if (!this.credentials) {
      throw new Error('Sheet updates require service account authentication. Please configure GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON.');
    }

    try {
      console.log('🔐 Using Service Account for sheet update');
      return await this.updateWithServiceAccount(spreadsheetId, range, values);
    } catch (error) {
      console.error('💥 Service Account update failed:', error);
      throw error;
    }
  }

  private async updateWithServiceAccount(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    const accessToken = await this.getAccessToken();
    
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
    
    try {
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: values,
        }),
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Sheets API update error (${response.status}):`, errorText);
        throw new Error(`Sheets API update failed: ${response.status} ${errorText}`);
      }

      console.log('✅ Sheet data updated successfully');
    } catch (error) {
      console.error('💥 Error updating sheet data:', error);
      throw error;
    }
  }

  async batchUpdateSheetData(spreadsheetId: string, updates: Array<{range: string; values: any[][]}>): Promise<void> {
    if (!this.credentials) {
      throw new Error('Sheet updates require service account authentication. Please configure GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON.');
    }

    try {
      console.log('🔐 Using Service Account for batch sheet update');
      return await this.batchUpdateWithServiceAccount(spreadsheetId, updates);
    } catch (error) {
      console.error('💥 Service Account batch update failed:', error);
      throw error;
    }
  }

  private async batchUpdateWithServiceAccount(spreadsheetId: string, updates: Array<{range: string; values: any[][]}>): Promise<void> {
    const accessToken = await this.getAccessToken();
    
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
    
    const data = {
      valueInputOption: 'RAW',
      data: updates.map(update => ({
        range: update.range,
        values: update.values,
      })),
    };
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Sheets API batch update error (${response.status}):`, errorText);
        throw new Error(`Sheets API batch update failed: ${response.status} ${errorText}`);
      }

      console.log('✅ Batch sheet data updated successfully');
    } catch (error) {
      console.error('💥 Error in batch updating sheet data:', error);
      throw error;
    }
  }

  /**
   * Test the service account authentication without making actual API calls
   */
  async testServiceAccountAuth(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      if (!this.credentials) {
        return {
          success: false,
          error: 'Service account credentials not configured'
        };
      }

      console.log('🧪 Testing service account JWT creation...');
      const jwt = await this.createJWT();
      
      console.log('🧪 Testing token exchange...');
      const accessToken = await this.getAccessToken();
      
      return {
        success: true,
        details: {
          jwtLength: jwt.length,
          tokenObtained: !!accessToken,
          email: this.credentials.client_email
        }
      };
    } catch (error) {
      console.error('🧪 Service account test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          hasCredentials: !!this.credentials,
          email: this.credentials?.client_email || 'N/A'
        }
      };
    }
  }
}

// Export singleton instance
export const googleSheetsServiceFixed = new GoogleSheetsServiceAccountFixed();