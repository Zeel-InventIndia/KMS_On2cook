// Google Sheets Service Account Integration
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

class GoogleSheetsServiceAccount {
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
          project: this.credentials.project_id
        });
      } catch (error) {
        console.error('❌ Failed to parse service account credentials:', error);
        throw new Error('Invalid GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON format. Please ensure it contains valid JSON.');
      }
    } else {
      console.warn('⚠️ GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON not found. Service account authentication is required for Google Sheets operations.');
    }
  }

  private async getAccessToken(): Promise<string> {
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
            throw new Error('JWT signature validation failed. This usually indicates an issue with the service account private key format or content.');
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
      scope: 'https://www.googleapis.com/auth/spreadsheets', // Full spreadsheet access for read/write
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
      // For string data, use btoa
      base64 = btoa(data);
    } else {
      // For ArrayBuffer data, convert to string first
      const bytes = new Uint8Array(data);
      const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
      base64 = btoa(binaryString);
    }
    
    // Convert to base64url format
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private async signWithRS256(data: string, privateKey: string): Promise<ArrayBuffer> {
    try {
      // Clean up the private key - handle both formats
      let cleanKey = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\r/g, '')
        .replace(/\n/g, '')
        .replace(/\s+/g, '');

      // Decode the base64 private key
      const keyData = Uint8Array.from(atob(cleanKey), c => c.charCodeAt(0));
      
      // Import the private key
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        keyData.buffer,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256',
        },
        false,
        ['sign']
      );

      // Sign the data
      const encoder = new TextEncoder();
      const dataToSign = encoder.encode(data);
      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        dataToSign
      );

      // Return the raw signature buffer
      return signature;
    } catch (error) {
      console.error('JWT signing error:', error);
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
      console.log('Using Service Account authentication for Google Sheets');
      return await this.fetchWithServiceAccount(spreadsheetId, range);
    } catch (error) {
      console.error('Service Account authentication failed:', error);
      throw error;
    }
  }

  private async fetchWithServiceAccount(spreadsheetId: string, range: string): Promise<any[]> {
    const accessToken = await this.getAccessToken();
    
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Sheets API error with service account (${response.status}):`, errorText);
        throw new Error(`Sheets API request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data.values || [];
    } catch (error) {
      console.error('Error fetching sheet data with service account:', error);
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
  validateServiceAccountConfiguration(): { valid: boolean; error?: string } {
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
        error: `Service account credentials missing required fields: ${missingFields.join(', ')}`
      };
    }

    if (!this.credentials.private_key.includes('BEGIN PRIVATE KEY')) {
      return {
        valid: false,
        error: 'Service account private key appears to be invalid or malformed.'
      };
    }

    return { valid: true };
  }

  async updateSheetData(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    if (this.credentials) {
      try {
        console.log('Using Service Account for sheet update');
        return await this.updateWithServiceAccount(spreadsheetId, range, values);
      } catch (error) {
        console.error('Service Account update failed:', error);
        throw error;
      }
    } else {
      throw new Error('Sheet updates require service account authentication');
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
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Sheets API update error (${response.status}):`, errorText);
        throw new Error(`Sheets API update failed: ${response.status} ${errorText}`);
      }

      console.log('Sheet data updated successfully');
    } catch (error) {
      console.error('Error updating sheet data:', error);
      throw error;
    }
  }

  async batchUpdateSheetData(spreadsheetId: string, updates: Array<{range: string; values: any[][]}>): Promise<void> {
    if (this.credentials) {
      try {
        console.log('Using Service Account for batch sheet update');
        return await this.batchUpdateWithServiceAccount(spreadsheetId, updates);
      } catch (error) {
        console.error('Service Account batch update failed:', error);
        throw error;
      }
    } else {
      throw new Error('Sheet updates require service account authentication');
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
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Sheets API batch update error (${response.status}):`, errorText);
        throw new Error(`Sheets API batch update failed: ${response.status} ${errorText}`);
      }

      console.log('Batch sheet data updated successfully');
    } catch (error) {
      console.error('Error in batch updating sheet data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsServiceAccount();