import { projectId, publicAnonKey } from './supabase/info';

export interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  lastChecked: Date;
  error?: string;
  responseTime?: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'offline';
  services: ServiceStatus[];
  canWorkOffline: boolean;
  recommendOfflineMode: boolean;
}

class ServiceMonitor {
  private lastHealthCheck: SystemHealth | null = null;
  private healthCheckInterval: number | null = null;

  async checkGoogleSheetsHealth(): Promise<ServiceStatus> {
    const startTime = performance.now();
    
    try {
      // Test with a simple, fast endpoint
      const testUrls = [
        'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=0&headers=0',
        'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv'
      ];

      for (const url of testUrls) {
        try {
          const response = await fetch(url, {
            method: 'HEAD', // Just check if accessible, don't download full data
            signal: AbortSignal.timeout(5000)
          });
          
          const responseTime = performance.now() - startTime;
          
          if (response.ok) {
            return {
              name: 'Google Sheets',
              status: responseTime > 3000 ? 'degraded' : 'online',
              lastChecked: new Date(),
              responseTime: Math.round(responseTime)
            };
          }
        } catch (error) {
          continue; // Try next URL
        }
      }

      return {
        name: 'Google Sheets',
        status: 'offline',
        lastChecked: new Date(),
        error: 'All Google Sheets URLs failed or returned access denied',
        responseTime: Math.round(performance.now() - startTime)
      };
      
    } catch (error) {
      return {
        name: 'Google Sheets',
        status: 'offline',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Math.round(performance.now() - startTime)
      };
    }
  }

  async checkDropboxHealth(): Promise<ServiceStatus> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/dropbox/self-test`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(8000)
      });

      const responseTime = performance.now() - startTime;
      const result = await response.json();

      if (result.success && result.dropboxConnected) {
        return {
          name: 'Dropbox',
          status: responseTime > 5000 ? 'degraded' : 'online',
          lastChecked: new Date(),
          responseTime: Math.round(responseTime)
        };
      } else {
        return {
          name: 'Dropbox',
          status: 'offline',
          lastChecked: new Date(),
          error: result.error || 'Token validation failed',
          responseTime: Math.round(responseTime)
        };
      }
      
    } catch (error) {
      return {
        name: 'Dropbox',
        status: 'offline',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Service unreachable',
        responseTime: Math.round(performance.now() - startTime)
      };
    }
  }

  async checkServerHealth(): Promise<ServiceStatus> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/health`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: AbortSignal.timeout(6000)
      });

      const responseTime = performance.now() - startTime;

      if (response.ok) {
        return {
          name: 'Server',
          status: responseTime > 2000 ? 'degraded' : 'online',
          lastChecked: new Date(),
          responseTime: Math.round(responseTime)
        };
      } else {
        return {
          name: 'Server',
          status: 'offline',
          lastChecked: new Date(),
          error: `HTTP ${response.status}: ${response.statusText}`,
          responseTime: Math.round(responseTime)
        };
      }
      
    } catch (error) {
      return {
        name: 'Server',
        status: 'offline',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Server unreachable',
        responseTime: Math.round(performance.now() - startTime)
      };
    }
  }

  async checkSystemHealth(): Promise<SystemHealth> {
    console.log('🏥 Running system health check...');
    
    const [sheetsStatus, dropboxStatus, serverStatus] = await Promise.allSettled([
      this.checkGoogleSheetsHealth(),
      this.checkDropboxHealth(), 
      this.checkServerHealth()
    ]);

    const services: ServiceStatus[] = [
      sheetsStatus.status === 'fulfilled' ? sheetsStatus.value : {
        name: 'Google Sheets',
        status: 'unknown',
        lastChecked: new Date(),
        error: 'Health check failed'
      },
      dropboxStatus.status === 'fulfilled' ? dropboxStatus.value : {
        name: 'Dropbox',
        status: 'unknown', 
        lastChecked: new Date(),
        error: 'Health check failed'
      },
      serverStatus.status === 'fulfilled' ? serverStatus.value : {
        name: 'Server',
        status: 'unknown',
        lastChecked: new Date(), 
        error: 'Health check failed'
      }
    ];

    // Determine overall system health
    const onlineServices = services.filter(s => s.status === 'online').length;
    const offlineServices = services.filter(s => s.status === 'offline').length;
    
    let overall: SystemHealth['overall'];
    if (onlineServices === services.length) {
      overall = 'healthy';
    } else if (onlineServices > 0) {
      overall = 'degraded';
    } else {
      overall = 'offline';
    }

    // Determine if offline mode is recommended
    const criticalServicesDown = services.filter(s => 
      (s.name === 'Google Sheets' || s.name === 'Server') && s.status === 'offline'
    ).length;

    const recommendOfflineMode = criticalServicesDown >= 2 || 
      (services.find(s => s.name === 'Google Sheets')?.status === 'offline' && 
       services.find(s => s.name === 'Server')?.status === 'offline');

    const health: SystemHealth = {
      overall,
      services,
      canWorkOffline: true, // Our system supports offline mode
      recommendOfflineMode
    };

    this.lastHealthCheck = health;
    console.log('🏥 Health check complete:', health);
    
    return health;
  }

  getLastHealthCheck(): SystemHealth | null {
    return this.lastHealthCheck;
  }

  startMonitoring(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = window.setInterval(() => {
      this.checkSystemHealth().catch(error => {
        console.error('Health check failed:', error);
      });
    }, intervalMs);

    // Run initial health check
    this.checkSystemHealth().catch(error => {
      console.error('Initial health check failed:', error);
    });
  }

  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Quick check - just test if Google Sheets returns HTML (access denied)
  async quickGoogleSheetsCheck(): Promise<boolean> {
    try {
      const response = await fetch(
        'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=0',
        { 
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        }
      );
      
      if (response.ok) {
        const text = await response.text();
        // If we get HTML instead of CSV, it's an access issue
        return !text.includes('<!DOCTYPE html>') && !text.includes('Sorry, unable to open');
      }
      
      return false;
    } catch {
      return false;
    }
  }
}

export const serviceMonitor = new ServiceMonitor();

// Convenience function for components
export const checkIfShouldUseOfflineMode = async (): Promise<boolean> => {
  try {
    const health = await serviceMonitor.checkSystemHealth();
    return health.recommendOfflineMode;
  } catch {
    return true; // If health check fails, recommend offline mode
  }
};