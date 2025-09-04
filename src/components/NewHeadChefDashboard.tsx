import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  RefreshCw, 
  AlertCircle, 
  Eye,
  Move,
  ChefHat
} from 'lucide-react';
import { User, DemoRequest, Task, TEAM_GROUPS, TIME_SLOTS, getAllowedTimeSlots } from '../App';
import { RecipeRepositoryV2 } from './RecipeRepositoryV2';
import { CreateTaskModal } from './CreateTaskModal';
import { DemoDetailModal } from './DemoDetailModal';
import { GridSchedule } from './GridSchedule';

interface NewHeadChefDashboardProps {
  user: User;
  demoRequests: DemoRequest[];
  tasks: Task[];
  onUpdateDemoRequest: (request: DemoRequest) => void;
  onUpdateTask: (task: Task) => void;
  onAddTask: (task: Task) => void;
  onAddDemoRequest: (request: DemoRequest) => void;
  onLogout: () => void;
  onRefreshSheets?: () => void;
  isLoadingSheets?: boolean;
  lastSheetsUpdate?: string | null;
  dataSource?: 'csv' | 'csv-client';
  csvError?: string | null;
}

export function NewHeadChefDashboard({
  user,
  demoRequests,
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
  csvError
}: NewHeadChefDashboardProps) {
  const [selectedDemo, setSelectedDemo] = useState<DemoRequest | null>(null);
  const [showDemoDetail, setShowDemoDetail] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DemoRequest | null>(null);

  // Filter unassigned requests (sorted by date)
  const unassignedRequests = demoRequests
    .filter(req => 
      req.leadStatus === 'demo_planned' && 
      req.recipes.length > 0 && 
      !req.assignedTeam
    )
    .sort((a, b) => new Date(a.demoDate).getTime() - new Date(b.demoDate).getTime());

  // Get assigned requests for team scheduling - include demo_given for visibility
  const assignedRequests = demoRequests.filter(req => 
    req.assignedTeam && 
    ['demo_planned', 'demo_rescheduled', 'demo_given'].includes(req.leadStatus)
  );

  const handleViewDemo = (demo: DemoRequest) => {
    setSelectedDemo(demo);
    setShowDemoDetail(true);
  };

  const handleAssignToTeam = (demo: DemoRequest, teamId: number, timeSlot: string) => {
    const allowedSlots = getAllowedTimeSlots(demo.demoTime || '');
    
    if (!allowedSlots.includes(timeSlot)) {
      alert(`Demo time ${demo.demoTime} is not compatible with slot ${timeSlot}`);
      return;
    }

    const updatedDemo = {
      ...demo,
      assignedTeam: teamId,
      assignedSlot: timeSlot,
      status: 'assigned' as const
    };
    onUpdateDemoRequest(updatedDemo);
  };

  const handleDragStart = (demo: DemoRequest) => {
    setDraggedItem(demo);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, teamId: number, timeSlot: string) => {
    e.preventDefault();
    if (draggedItem) {
      handleAssignToTeam(draggedItem, teamId, timeSlot);
      setDraggedItem(null);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'demo_planned': return 'bg-green-100 text-green-800 border-green-200';
      case 'demo_rescheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'demo_cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'demo_given': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Helper function to get assigned demo for a specific team and time slot
  const getAssignedDemo = (teamId: number, timeSlot: string) => {
    return assignedRequests.find(req => req.assignedTeam === teamId && req.assignedSlot === timeSlot);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Head Chef Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user.name} • Kitchen Operations Manager
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
              <Button onClick={() => setShowCreateTask(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Request
              </Button>
              <Button variant="outline" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Error Alert */}
      {csvError && (
        <div className="container mx-auto px-4 pt-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Data Loading Error:</strong> {csvError}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content - Two Horizontal Halves Layout */}
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6 h-[calc(100vh-200px)]">
          
          {/* Top Half - Unassigned Requests */}
          <div className="h-1/2">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Unassigned Requests ({unassignedRequests.length}) - Sorted by Date
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {unassignedRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No unassigned requests</p>
                    <p className="text-sm">All demos with recipes have been assigned</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {unassignedRequests.map((demo) => (
                      <div
                        key={demo.id}
                        draggable
                        onDragStart={() => handleDragStart(demo)}
                        className="border rounded-lg p-4 space-y-3 cursor-move hover:shadow-md transition-shadow bg-white"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <h4 className="font-medium">{demo.clientName}</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(demo.demoDate)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {demo.demoTime}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className={getStatusColor(demo.leadStatus)}>
                              {demo.leadStatus === 'demo_given' ? 'Demo Given ✓' : demo.leadStatus.replace('_', ' ')}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDemo(demo)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            <strong>Assignee:</strong> {demo.assignee}
                          </p>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              <strong>Recipes ({demo.recipes.length}):</strong>
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {demo.recipes.slice(0, 2).map((recipe, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {recipe}
                                </Badge>
                              ))}
                              {demo.recipes.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{demo.recipes.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {demo.notes && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Notes:</strong> {demo.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t">
                          <Move className="h-3 w-3" />
                          Drag to assign to team
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Half - Tabs */}
          <div className="h-1/2">
            <Tabs defaultValue="schedule" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="schedule">Team Schedule</TabsTrigger>
                <TabsTrigger value="grid">5×5 Grid</TabsTrigger>
                <TabsTrigger value="recipes">Recipe Repository</TabsTrigger>
              </TabsList>

              {/* Team Schedule Tab - Tabular Format */}
              <TabsContent value="schedule" className="flex-1 mt-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Kitchen Team Schedule (Time vs Teams)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-auto">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium text-sm">Time Slot</th>
                            {TEAM_GROUPS.map((team) => (
                              <th key={team.id} className="text-center p-3 font-medium text-sm border-l">
                                <div>{team.name}</div>
                                <div className="text-xs text-muted-foreground font-normal">
                                  {team.members.join(', ')}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {TIME_SLOTS.map((timeSlot, timeIndex) => (
                            <tr key={timeSlot} className={timeIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                              <td className="p-3 font-medium text-sm border-r">
                                {timeSlot}
                              </td>
                              {TEAM_GROUPS.map((team) => {
                                const assignedDemo = getAssignedDemo(team.id, timeSlot);
                                
                                return (
                                  <td 
                                    key={team.id} 
                                    className="p-3 border-l min-h-[80px] align-top"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, team.id, timeSlot)}
                                  >
                                    {assignedDemo ? (
                                      <div className={`${
                                        assignedDemo.leadStatus === 'demo_given' 
                                          ? 'bg-blue-50 border border-blue-200' 
                                          : 'bg-green-50 border border-green-200'
                                      } rounded p-3 min-h-[60px] space-y-2`}>
                                        <div className="flex items-center justify-between">
                                          <span className={`font-medium text-sm ${
                                            assignedDemo.leadStatus === 'demo_given'
                                              ? 'text-blue-900'
                                              : 'text-green-900'
                                          }`}>
                                            {assignedDemo.clientName}
                                          </span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleViewDemo(assignedDemo)}
                                            className={`h-6 w-6 p-0 ${
                                              assignedDemo.leadStatus === 'demo_given'
                                                ? 'text-blue-700 hover:text-blue-900'
                                                : 'text-green-700 hover:text-green-900'
                                            }`}
                                          >
                                            <Eye className="h-3 w-3" />
                                          </Button>
                                        </div>
                                        <div className={`text-xs ${
                                          assignedDemo.leadStatus === 'demo_given'
                                            ? 'text-blue-700'
                                            : 'text-green-700'
                                        }`}>
                                          {assignedDemo.recipes.slice(0, 2).join(', ')}
                                          {assignedDemo.recipes.length > 2 && '...'}
                                        </div>
                                        <div className={`text-xs ${
                                          assignedDemo.leadStatus === 'demo_given'
                                            ? 'text-blue-600'
                                            : 'text-green-600'
                                        }`}>
                                          {formatDate(assignedDemo.demoDate)} • {assignedDemo.demoTime}
                                        </div>
                                        {assignedDemo.leadStatus === 'demo_given' && (
                                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                            Demo Given ✓
                                          </Badge>
                                        )}
                                        {(assignedDemo.leadStatus === 'demo_rescheduled' || 
                                          assignedDemo.leadStatus === 'demo_cancelled') && (
                                          <Badge variant="destructive" className="text-xs">
                                            {assignedDemo.leadStatus.replace('_', ' ')}
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="bg-gray-50 border border-dashed border-gray-300 rounded p-3 min-h-[60px] flex items-center justify-center text-xs text-muted-foreground">
                                        Drop demo here
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Grid Schedule Tab */}
              <TabsContent value="grid" className="flex-1 mt-4">
                <GridSchedule
                  user={user}
                  demoRequests={demoRequests}
                  onUpdateDemoRequest={onUpdateDemoRequest}
                />
              </TabsContent>

              {/* Recipe Repository Tab */}
              <TabsContent value="recipes" className="flex-1 mt-4">
                <Card className="h-full">
                  <CardContent className="p-0 h-full">
                    <RecipeRepositoryV2 user={user} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Demo Detail Modal */}
      <DemoDetailModal
        demo={selectedDemo}
        isOpen={showDemoDetail}
        onClose={() => setShowDemoDetail(false)}
        onUpdate={onUpdateDemoRequest}
      />

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