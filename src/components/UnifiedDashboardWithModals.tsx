import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  RefreshCw,
  AlertCircle,
  Eye,
  ChefHat,
  User as UserIcon,
  Filter,
  BarChart3,
  CalendarIcon,
  Settings
} from 'lucide-react';
import { User, DemoRequest, Task, TEAM_GROUPS, TIME_SLOTS, formatDateSafely } from '../App';
import { RecipeRepositoryFromSheets } from './RecipeRepositoryFromSheets';
import { DemoDetailModal } from './DemoDetailModal';
import { CreateTaskModal } from './CreateTaskModal';
import { TeamManagement } from './teams/TeamManagement';
import { assignTeamMember, assignAllTeamMembers, getTeamAssignmentInfo } from '../utils/teamMemberAssignment';
import { DemoCard } from './DemoCard';
import { CreateKitchenRequestModal } from './CreateKitchenRequestModal';

interface UnifiedDashboardProps {
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
  onShowReporting?: () => void;
}

export function UnifiedDashboard({
  user,
  demoRequests,
  allDemoRequests,
  tasks,
  onUpdateDemoRequest,
  onUpdateTask,
  onAddTask,
  onAddDemoRequest,
  onLogout,
  onRefreshSheets,
  isLoadingSheets = false,
  lastSheetsUpdate,
  dataSource = 'csv',
  csvError,
  onShowReporting
}: UnifiedDashboardProps) {
  const [selectedDemo, setSelectedDemo] = useState<DemoRequest | null>(null);
  const [showDemoDetail, setShowDemoDetail] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateKitchenRequest, setShowCreateKitchenRequest] = useState(false);
  const [showTeamManagement, setShowTeamManagement] = useState(false);

  const handleCreateTask = (taskData: Omit<Task, 'id'>) => {
    if (onAddTask) {
      const newTask: Task = {
        ...taskData,
        id: `manual-task-${Date.now()}`,
      };
      onAddTask(newTask);
    }
    setShowCreateTask(false);
  };

  const handleCreateKitchenRequest = (request: DemoRequest) => {
    if (onAddDemoRequest) {
      onAddDemoRequest(request);
    }
    setShowCreateKitchenRequest(false);
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1>Dashboard temporarily loading...</h1>
            <p>Kitchen request functionality is being integrated.</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showDemoDetail && selectedDemo && (
        <DemoDetailModal
          demo={selectedDemo}
          open={showDemoDetail}
          onClose={() => setShowDemoDetail(false)}
          onUpdate={onUpdateDemoRequest}
          userRole={user.role}
          onTestRecipePersistence={(demo) => {
            if (user.role === 'head_chef') {
              console.log('🧪 Testing recipe persistence for:', demo.clientName);
            }
          }}
        />
      )}

      {showCreateTask && onAddTask && (
        <CreateTaskModal
          open={showCreateTask}
          onClose={() => setShowCreateTask(false)}
          onCreate={handleCreateTask}
        />
      )}

      {showCreateKitchenRequest && (
        <CreateKitchenRequestModal
          open={showCreateKitchenRequest}
          onClose={() => setShowCreateKitchenRequest(false)}
          onCreateRequest={handleCreateKitchenRequest}
          user={user}
        />
      )}

      {showTeamManagement && (
        <TeamManagement
          open={showTeamManagement}
          onClose={() => setShowTeamManagement(false)}
        />
      )}
    </>
  );
}