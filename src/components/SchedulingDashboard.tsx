import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Calendar, Clock, Users, Plus, Settings, RefreshCw, AlertCircle, Database, CheckCircle, User as UserIcon, Calendar as CalendarIcon } from 'lucide-react';
import { User, DemoRequest, Task } from '../App';
import { CreateTaskModal } from './CreateTaskModal';
import { RecipeRepositoryV2 } from './RecipeRepositoryV2';
import { TeamScheduleGrid } from './TeamScheduleGrid';
import { TodayScheduleGrid } from './TodayScheduleGrid';

interface SchedulingDashboardProps {
  user: User;
  demoRequests: DemoRequest[];
  tasks: Task[];
  onUpdateDemoRequest: (request: DemoRequest) => void;
  onUpdateTask: (task: Task) => void;
  onAddTask: (task: Task) => void;
  onLogout: () => void;
  onRefreshSheets?: () => void;
  isLoadingSheets?: boolean;
  lastSheetsUpdate?: string | null;
  dataSource?: 'mock' | 'csv' | 'csv-client';
  csvError?: string | null;
}

export function SchedulingDashboard({
  user,
  demoRequests,
  tasks,
  onUpdateDemoRequest,
  onUpdateTask,
  onAddTask,
  onLogout,
  onRefreshSheets,
  isLoadingSheets = false,
  lastSheetsUpdate,
  dataSource = 'csv',
  csvError
}: SchedulingDashboardProps) {
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  // Filter pending demo requests that need team assignment
  const pendingRequests = demoRequests.filter(req => 
    req.leadStatus === 'demo_planned' && 
    req.recipes.length > 0 && 
    !req.assignedTeam
  );

  // Get assigned requests for team scheduling
  const assignedRequests = demoRequests.filter(req => 
    req.assignedTeam && 
    ['demo_planned', 'demo_rescheduled'].includes(req.leadStatus)
  );

  // Get today's scheduled items
  const today = new Date().toISOString().split('T')[0];
  const todayItems = [...assignedRequests, ...tasks].filter(item => {
    const itemDate = 'demoDate' in item ? item.demoDate : item.date;
    return itemDate === today;
  });

  const handleAssignToTeam = (requestId: string, teamNumber: number, timeSlot: string) => {
    const request = demoRequests.find(req => req.id === requestId);
    if (request) {
      const updatedRequest = {
        ...request,
        assignedTeam: teamNumber,
        assignedSlot: timeSlot,
        status: 'assigned' as const
      };
      onUpdateDemoRequest(updatedRequest);
    }
  };

  const handleCreateTask = (taskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...taskData,
      id: `manual-task-${Date.now()}`,
    };
    onAddTask(newTask);
    setShowCreateTask(false);
  };

  // Calculate statistics
  const stats = {
    pendingRequests: pendingRequests.length,
    assignedRequests: assignedRequests.length,
    todayItems: todayItems.length,
    totalTasks: tasks.length
  };

  // Check if we have no data
  const hasNoData = demoRequests.length === 0 && tasks.length === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Kitchen Management Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user.name} • Head Chef
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <div className="font-medium">Data Source: Google Sheets</div>
                {lastSheetsUpdate && (
                  <div className="text-muted-foreground">
                    Updated: {new Date(lastSheetsUpdate).toLocaleTimeString()}
                  </div>
                )}
              </div>
              {onRefreshSheets && (
                <Button 
                  variant="outline" 
                  onClick={onRefreshSheets}
                  disabled={isLoadingSheets}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingSheets ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
              <Button variant="outline" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* CSV Error Alert */}
        {csvError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Data Loading Error:</strong> {csvError}
              <br />
              <span className="text-sm">Unable to fetch data from Google Sheets. Please check your internet connection or contact support if the issue persists.</span>
            </AlertDescription>
          </Alert>
        )}

        {/* No Data State */}
        {hasNoData && !csvError && (
          <div className="text-center py-12">
            <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Demo Data Available</h2>
            <p className="text-muted-foreground mb-6">
              No demo requests found in the Google Sheets. The system automatically syncs data every 2 minutes.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setShowCreateTask(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Manual Task
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Data Source: Google Sheets (Auto-synced)
            </p>
          </div>
        )}

        {/* Show content only if we have data */}
        {!hasNoData && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingRequests}</div>
                  <p className="text-xs text-muted-foreground">
                    Need team assignment
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assigned Demos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.assignedRequests}</div>
                  <p className="text-xs text-muted-foreground">
                    Ready for execution
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Schedule</CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.todayItems}</div>
                  <p className="text-xs text-muted-foreground">
                    Items scheduled today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTasks}</div>
                  <p className="text-xs text-muted-foreground">
                    All tasks
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="pending">
                    Pending Requests ({stats.pendingRequests})
                  </TabsTrigger>
                  <TabsTrigger value="schedule">
                    Team Schedule
                  </TabsTrigger>
                  <TabsTrigger value="today">
                    Today's Schedule
                  </TabsTrigger>
                  <TabsTrigger value="recipes">
                    Recipe Repository
                  </TabsTrigger>
                </TabsList>

                <Button onClick={() => setShowCreateTask(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>

              {/* Pending Requests Tab */}
              <TabsContent value="pending">
                <Card>
                  <CardHeader>
                    <CardTitle>Demo Requests Awaiting Team Assignment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pendingRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          No pending requests. All demo requests with recipes have been assigned to teams.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingRequests.map((request) => (
                          <div key={request.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <h4 className="font-medium">{request.clientName}</h4>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <UserIcon className="h-3 w-3" />
                                    {request.assignee}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    {new Date(request.demoDate).toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {request.demoTime}
                                  </span>
                                </div>
                              </div>
                              <Badge variant="secondary">
                                {request.recipes.length} recipes
                              </Badge>
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">
                                <strong>Recipes:</strong> {request.recipes.join(', ')}
                              </p>
                              {request.notes && (
                                <p className="text-sm text-muted-foreground">
                                  <strong>Notes:</strong> {request.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex gap-2 pt-2 border-t">
                              {[1, 2, 3, 4, 5].map((teamNum) => (
                                <Button
                                  key={teamNum}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAssignToTeam(request.id, teamNum, `${request.demoTime}`)}
                                >
                                  Assign to Team {teamNum}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Team Schedule Tab */}
              <TabsContent value="schedule">
                <TeamScheduleGrid
                  demoRequests={assignedRequests}
                  tasks={tasks}
                  onUpdateDemoRequest={onUpdateDemoRequest}
                  onUpdateTask={onUpdateTask}
                />
              </TabsContent>

              {/* Today's Schedule Tab */}
              <TabsContent value="today">
                <TodayScheduleGrid
                  demoRequests={assignedRequests}
                  tasks={tasks}
                  onUpdateDemoRequest={onUpdateDemoRequest}
                  onUpdateTask={onUpdateTask}
                />
              </TabsContent>

              {/* Recipe Repository Tab */}
              <TabsContent value="recipes">
                <RecipeRepositoryV2 user={user} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          isOpen={showCreateTask}
          onClose={() => setShowCreateTask(false)}
          onCreateTask={handleCreateTask}
          createdBy={user.name}
        />
      )}
    </div>
  );
}