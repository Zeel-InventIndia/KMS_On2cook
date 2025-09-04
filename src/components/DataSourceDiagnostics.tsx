import React, { useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, CheckCircle, RefreshCw, ExternalLink, Bug, Info } from 'lucide-react';
import { GoogleSheetsTestConnection } from './GoogleSheetsTestConnection';
import { GoogleSheetsTroubleshooter } from './GoogleSheetsTroubleshooter';
import { SystemStatusIndicator } from './SystemStatusIndicator';

interface DataSourceDiagnosticsProps {
  dataSource: 'csv' | 'csv-client' | 'mock' | 'loading';
  csvError: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function DataSourceDiagnostics({ 
  dataSource, 
  csvError, 
  onRefresh, 
  isRefreshing 
}: DataSourceDiagnosticsProps) {
  // Use the comprehensive SystemStatusIndicator
  return (
    <SystemStatusIndicator
      dataSource={dataSource}
      csvError={csvError}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
    />
  );
}