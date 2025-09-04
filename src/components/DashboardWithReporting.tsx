import React, { useState } from 'react';
import { User, DemoRequest, Task } from '../App';
import { UnifiedDashboard } from './UnifiedDashboardCorrectFormat';
import { ReportingDashboard } from './ReportingDashboard';

interface DashboardWithReportingProps {
  user: User;
  demoRequests: DemoRequest[];
  allDemoRequests: DemoRequest[];
  tasks: Task[];
  onUpdateDemoRequest: (request: DemoRequest) => void;
  onUpdateTask?: (task: Task) => void;
  onAddTask?: (task: Task) => void;
  onAddDemoRequest?: (request: DemoRequest) => void;
  onLogout: () => void;
  onRefreshSheets?: () => void;
  isLoadingSheets?: boolean;
  lastSheetsUpdate?: string | null;
  dataSource?: 'csv' | 'csv-client' | 'mock';
  csvError?: string | null;
}

export function DashboardWithReporting(props: DashboardWithReportingProps) {
  const [showReporting, setShowReporting] = useState(false);

  // Check if user has access to reporting
  const hasReportingAccess = () => {
    return props.user.role === 'head_chef' || props.user.role === 'ceo';
  };

  if (showReporting && hasReportingAccess()) {
    return (
      <ReportingDashboard
        user={props.user}
        demoRequests={props.allDemoRequests}
        tasks={props.tasks}
        onBack={() => setShowReporting(false)}
      />
    );
  }

  return (
    <UnifiedDashboard
      {...props}
      onShowReporting={hasReportingAccess() ? () => setShowReporting(true) : undefined}
    />
  );
}