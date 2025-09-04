import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
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

  BarChart3
} from 'lucide-react';
import { User, DemoRequest, Task, TEAM_GROUPS, TIME_SLOTS, formatDateSafely } from '../App';
import { RecipeRepositoryFromSheets } from './RecipeRepositoryFromSheets';
import { DemoDetailModal } from './DemoDetailModal';
import { CreateTaskModal } from './CreateTaskModal';


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
  const [scheduleFilter, setScheduleFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const [draggedRequest, setDraggedRequest] = useState<DemoRequest | null>(null);
  const [dropTarget, setDropTarget] = useState<{teamId: number, timeSlot: string} | null>(null);

  // Helper function to check if demo can be scheduled today
  const canScheduleToday = (demoDate: string) => {
    const today = new Date().toISOString().split('T')[0];
    const demo = new Date(demoDate).toISOString().split('T')[0];
    return demo === today;
  };

  // Helper function to get unique demo dates for filtering
  const getUniqueDates = () => {
    const dates = allDemoRequests.map(req => req.demoDate);
    const uniqueDates = [...new Set(dates)].sort();
    return uniqueDates;
  };

  // Get unassigned requests - include rescheduled and cancelled demos
  const getUnassignedRequests = () => {
    console.log('🔍 DASHBOARD DEBUG - Getting unassigned requests from', allDemoRequests.length, 'total requests');
    
    let filtered = allDemoRequests
      .filter(req => {
        // Show rescheduled demos back in unassigned with updated info
        if (req.leadStatus === 'demo_rescheduled') {
          const shouldShow = !req.assignedTeam;
          console.log(`🔍 DASHBOARD DEBUG - Rescheduled ${req.clientName}: assignedTeam=${req.assignedTeam}, shouldShow=${shouldShow}`);
          return shouldShow;
        }
        
        // Show cancelled demos in unassigned for visibility
        if (req.leadStatus === 'demo_cancelled') {
          console.log(`🔍 DASHBOARD DEBUG - Cancelled ${req.clientName}: showing in unassigned`);
          return true;
        }
        
        // Regular unassigned demos - only show for presales team if no recipes yet
        // For other roles, only show demos that have recipes added by presales team
        const isPlanned = req.leadStatus === 'demo_planned';
        const notAssigned = !req.assignedTeam;
        const hasRecipes = req.recipes && req.recipes.length > 0;
        
        // For presales team - show their assigned demos even without recipes so they can add recipes
        if (user.role === 'presales') {
          const isAssignedToCurrentUser = req.assignee === user.name.toLowerCase();
          const shouldShow = isPlanned && notAssigned && isAssignedToCurrentUser;
          
          if (isPlanned) {
            console.log(`🔍 DASHBOARD DEBUG - Presales ${req.clientName}: recipes=${req.recipes.length}, assignedTeam=${req.assignedTeam}, assignedTo=${req.assignee}, currentUser=${user.name.toLowerCase()}, shouldShow=${shouldShow}`);
          }
          
          return shouldShow;
        }
        
        // For non-presales roles - only show demos that have recipes (added by presales team)
        const shouldShow = isPlanned && notAssigned && hasRecipes;
        
        if (isPlanned) {
          console.log(`🔍 DASHBOARD DEBUG - ${user.role} ${req.clientName}: recipes=${req.recipes.length}, hasRecipes=${hasRecipes}, assignedTeam=${req.assignedTeam}, shouldShow=${shouldShow}`);
        }
        
        return shouldShow;
      });
    
    // Apply date filter
    if (dateFilter !== 'all') {
      filtered = filtered.filter(req => req.demoDate === dateFilter);
    }
    
    // Sort by date
    filtered = filtered.sort((a, b) => new Date(a.demoDate).getTime() - new Date(b.demoDate).getTime());
    
    console.log('🔍 DASHBOARD DEBUG - Final unassigned count:', filtered.length);
    return filtered;
  };

  const unassignedRequests = getUnassignedRequests();

  // Get ALL assigned requests for schedule - ALWAYS include both demo_planned and demo_given
  const getAllAssignedRequests = () => {
    return allDemoRequests.filter(req => 
      req.assignedTeam && 
      ['demo_planned', 'demo_rescheduled', 'demo_given'].includes(req.leadStatus)
    );
  };

  const allAssignedRequests = getAllAssignedRequests();

  // Filter schedule based on selected filter - but ALWAYS show both demo_planned and demo_given
  const getFilteredSchedule = () => {
    switch (scheduleFilter) {
      case 'my_demos':
        // Show only demos assigned to current user but include both planned and given
        return allAssignedRequests.filter(req => 
          req.assignee === user.name.toLowerCase()
        );
      case 'active_only':
        // Show only active demos (planned and rescheduled, exclude given)
        return allAssignedRequests.filter(req => 
          ['demo_planned', 'demo_rescheduled'].includes(req.leadStatus)
        );
      case 'completed_only':
        // Show only completed demos
        return allAssignedRequests.filter(req => req.leadStatus === 'demo_given');
      default:
        // Show ALL assigned demos - both planned and given
        return allAssignedRequests;
    }
  };

  const filteredSchedule = getFilteredSchedule();

  const handleViewDemo = (demo: DemoRequest) => {
    setSelectedDemo(demo);
    setShowDemoDetail(true);
  };

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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, demo: DemoRequest) => {
    if (user.role !== 'head_chef') return;
    
    // Check if demo can be scheduled today
    if (!canScheduleToday(demo.demoDate)) {
      e.preventDefault();
      return;
    }
    
    setDraggedRequest(demo);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, teamId: number, timeSlot: string) => {
    if (!draggedRequest || user.role !== 'head_chef') return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ teamId, timeSlot });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, teamId: number, timeSlot: string) => {
    e.preventDefault();
    
    if (!draggedRequest || user.role !== 'head_chef') return;
    
    // Check if the slot is already occupied
    const existingDemo = getAssignedDemo(teamId, timeSlot);
    if (existingDemo) {
      console.log('Slot already occupied');
      setDraggedRequest(null);
      setDropTarget(null);
      return;
    }
    
    // Update the demo request with team and slot assignment
    const updatedRequest = {
      ...draggedRequest,
      assignedTeam: teamId,
      assignedSlot: timeSlot,
    };
    
    onUpdateDemoRequest(updatedRequest);
    setDraggedRequest(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedRequest(null);
    setDropTarget(null);
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
    return formatDateSafely(dateString, dateString);
  };

  // Helper function to get assigned demo for a specific team and time slot
  const getAssignedDemo = (teamId: number, timeSlot: string) => {
    return filteredSchedule.find(req => req.assignedTeam === teamId && req.assignedSlot === timeSlot);
  };

  // Get display label for demo status
  const getStatusDisplayLabel = (demo: DemoRequest) => {
    if (demo.leadStatus === 'demo_rescheduled') {
      return 'Rescheduled Demo';
    }
    if (demo.leadStatus === 'demo_cancelled') {
      return 'Demo Cancelled';
    }
    if (demo.leadStatus === 'demo_given') {
      return 'Demo Given ✓';
    }
    return demo.leadStatus.replace('_', ' ');
  };

  const getDashboardTitle = () => {
    switch (user.role) {
      case 'head_chef': return 'Head Chef Dashboard';
      case 'presales': return 'Presales Dashboard';
      case 'sales': return 'Sales Dashboard';
      case 'culinary_team': return 'Kitchen Team Dashboard';
      default: return 'Dashboard';
    }
  };

  const getDashboardSubtitle = () => {
    switch (user.role) {
      case 'head_chef': return 'Kitchen Operations Manager';
      case 'presales': return 'Demo Planning & Recipe Management';
      case 'sales': return 'Sales Operations & Demo Tracking';
      case 'culinary_team': return `Kitchen Team Member - Team ${user.team || 'Unassigned'}`;
      default: return 'Team Member';
    }
  };

  // Count statistics for display
  const scheduleStats = {
    total: allAssignedRequests.length,
    planned: allAssignedRequests.filter(req => req.leadStatus === 'demo_planned').length,
    given: allAssignedRequests.filter(req => req.leadStatus === 'demo_given').length,
    myDemos: allAssignedRequests.filter(req => req.assignee === user.name.toLowerCase()).length
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{getDashboardTitle()}</h1>
              <p className="text-muted-foreground">
                Welcome back, {user.name} • {getDashboardSubtitle()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm">
                <div className="font-medium">
                  Data Source: {dataSource === 'mock' ? 'Fallback Data' : 'Google Sheets'}
                  {dataSource === 'mock' && (
                    <span className="ml-1 text-yellow-600">⚠️</span>
                  )}
                </div>
                {lastSheetsUpdate && (
                  <div className="text-muted-foreground">
                    Updated: {new Date(lastSheetsUpdate).toLocaleTimeString()}
                  </div>
                )}
                {dataSource === 'mock' && (
                  <div className="text-yellow-600 text-xs">
                    Using sample data
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

              {onShowReporting && (
                <Button 
                  variant="outline" 
                  onClick={onShowReporting}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Reports
                </Button>
              )}
              {user.role === 'head_chef' && onAddTask && (
                <Button onClick={() => setShowCreateTask(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Request
                </Button>
              )}
              <Button variant="outline" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>



      {/* Main Content - Two Horizontal Halves Layout */}
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6 h-[calc(100vh-200px)]">
          
          {/* Top Half - Unassigned/Pending Requests */}
          <div className="h-1/2">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    {user.role === 'presales' 
                      ? `My Demo Requests (${unassignedRequests.length}) - Add Recipes & Ready for Assignment`
                      : `Ready for Assignment (${unassignedRequests.length}) - Demos with Recipes Added`
                    }
                    {user.role === 'head_chef' && unassignedRequests.length > 0 && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        ⤵️ Drag to Schedule (Today's Demos Only)
                      </Badge>
                    )}
                  </CardTitle>
                  
                  {/* Date Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="all">All Dates</option>
                      {getUniqueDates().map(date => {
                        const isToday = canScheduleToday(date);
                        const dateLabel = formatDate(date);
                        return (
                          <option key={date} value={date}>
                            {isToday ? `${dateLabel} (Today)` : dateLabel}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {unassignedRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    {user.role === 'presales' ? (
                      <>
                        <p>No demo requests assigned to you</p>
                        <p className="text-sm">You have no pending demos to add recipes to</p>
                      </>
                    ) : (
                      <>
                        <p>No requests ready for assignment</p>
                        <p className="text-sm">All demos with recipes have been assigned to teams</p>
                        {user.role === 'head_chef' && (
                          <p className="text-xs mt-2 text-blue-600">
                            💡 Demos appear here after presales team adds recipes
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {unassignedRequests.map((demo) => {
                      const canDrag = user.role === 'head_chef' && canScheduleToday(demo.demoDate);
                      const isToday = canScheduleToday(demo.demoDate);
                      
                      return (
                        <div
                          key={demo.id}
                          draggable={canDrag}
                          onDragStart={(e) => handleDragStart(e, demo)}
                          onDragEnd={handleDragEnd}
                          className={`border rounded-lg p-4 space-y-3 bg-white hover:shadow-md transition-shadow ${
                            canDrag ? 'cursor-move' : ''
                          } ${draggedRequest?.id === demo.id ? 'opacity-50' : ''} ${
                            !isToday && user.role === 'head_chef' ? 'opacity-60 border-dashed' : ''
                          }`}
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
                              {getStatusDisplayLabel(demo)}
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
                          {demo.salesRep && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Sales Rep:</strong> {demo.salesRep}
                            </p>
                          )}
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">
                              <strong>Recipes ({demo.recipes.length}):</strong>
                            </p>
                            {demo.recipes.length === 0 ? (
                              <div className="text-sm bg-amber-50 text-amber-700 p-2 rounded border border-amber-200">
                                {user.role === 'presales' && demo.assignee === user.name.toLowerCase() ? (
                                  <><strong>⚠️ Action Required:</strong> Add recipes to make this demo available for team assignment.</>
                                ) : (
                                  <><strong>⏳ Pending:</strong> Waiting for presales team to add recipes.</>
                                )}
                              </div>
                            ) : (
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
                            )}
                          </div>
                          {demo.notes && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Notes:</strong> {demo.notes}
                            </p>
                          )}
                        </div>

                        {/* Status-specific indicators */}
                        {demo.leadStatus === 'demo_rescheduled' && (
                          <div className="text-sm bg-yellow-50 text-yellow-700 p-2 rounded border border-yellow-200">
                            <strong>⚠️ Rescheduled:</strong> Demo was rescheduled and needs reassignment
                          </div>
                        )}
                        
                        {demo.leadStatus === 'demo_cancelled' && (
                          <div className="text-sm bg-red-50 text-red-700 p-2 rounded border border-red-200">
                            <strong>❌ Cancelled:</strong> Demo has been cancelled
                          </div>
                        )}

                        {/* Date-based scheduling indicator */}
                        {user.role === 'head_chef' && !isToday && (
                          <div className="text-sm bg-blue-50 text-blue-700 p-2 rounded border border-blue-200">
                            <strong>📅 Future Date:</strong> Can only be scheduled on {formatDate(demo.demoDate)}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Half - Schedule and Repository */}
          <div className="h-1/2">
            <Tabs defaultValue="schedule" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="schedule">Kitchen Schedule</TabsTrigger>
                <TabsTrigger value="recipes">Recipe Repository</TabsTrigger>
              </TabsList>

              {/* Kitchen Schedule Tab */}
              <TabsContent value="schedule" className="flex-1 mt-4">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Kitchen Schedule - Time vs Teams
                        </CardTitle>
                        <div className="text-sm text-muted-foreground">
                          Showing: {filteredSchedule.length} of {scheduleStats.total} total 
                          ({scheduleStats.planned} planned + {scheduleStats.given} completed)
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <select
                          value={scheduleFilter}
                          onChange={(e) => setScheduleFilter(e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="all">All Demos (Planned + Completed)</option>
                          <option value="my_demos">My Assigned Demos ({scheduleStats.myDemos})</option>
                          <option value="active_only">Active Demos Only ({scheduleStats.planned})</option>
                          <option value="completed_only">Completed Demos Only ({scheduleStats.given})</option>
                        </select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto">
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
                                const isDropTarget = dropTarget?.teamId === team.id && dropTarget?.timeSlot === timeSlot;
                                
                                return (
                                  <td 
                                    key={team.id} 
                                    className={`border-l p-2 text-center ${
                                      isDropTarget ? 'bg-green-100 border-green-300' : ''
                                    }`}
                                    onDragOver={(e) => handleDragOver(e, team.id, timeSlot)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, team.id, timeSlot)}
                                  >
                                    {assignedDemo ? (
                                      <div 
                                        className={`p-2 rounded text-xs cursor-pointer transition-all hover:shadow-sm ${
                                          getStatusColor(assignedDemo.leadStatus)
                                        }`}
                                        onClick={() => handleViewDemo(assignedDemo)}
                                      >
                                        <div className="font-medium">{assignedDemo.clientName}</div>
                                        <div className="opacity-75">{assignedDemo.assignee}</div>
                                        {assignedDemo.recipes.length > 0 && (
                                          <div className="mt-1">
                                            <ChefHat className="h-3 w-3 inline mr-1" />
                                            {assignedDemo.recipes.length}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className={`text-gray-400 text-xs p-2 rounded ${
                                        isDropTarget ? 'bg-green-200 text-green-700' : ''
                                      }`}>
                                        {isDropTarget ? 'Drop Here' : 'Available'}
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

              {/* Recipe Repository Tab */}
              <TabsContent value="recipes" className="flex-1 mt-4">
                <RecipeRepositoryFromSheets user={user} />
              </TabsContent>

            </Tabs>
          </div>
        </div>
      </div>

      {/* Demo Detail Modal */}
      {selectedDemo && (
        <DemoDetailModal
          demo={selectedDemo}
          isOpen={showDemoDetail}
          onClose={() => {
            setShowDemoDetail(false);
            setSelectedDemo(null);
          }}
          onUpdate={onUpdateDemoRequest}
          currentUser={user}
          showMediaSection={user.role === 'head_chef' || user.role === 'culinary_team'}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          isOpen={showCreateTask}
          onClose={() => setShowCreateTask(false)}
          onCreateTask={handleCreateTask}
          user={user}
        />
      )}

      {/* Debug Panel */}
      {showDebugPanel && (
        <Dialog open={showDebugPanel} onOpenChange={setShowDebugPanel}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Debug Information</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">User Info</h3>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-medium">Data Source: {dataSource}</h3>
                <p className="text-sm text-muted-foreground">
                  Last update: {lastSheetsUpdate ? new Date(lastSheetsUpdate).toLocaleString() : 'Never'}
                </p>
              </div>
              <div>
                <h3 className="font-medium">Statistics</h3>
                <ul className="text-sm space-y-1">
                  <li>Total demo requests: {allDemoRequests.length}</li>
                  <li>Filtered demo requests: {demoRequests.length}</li>
                  <li>Unassigned requests: {unassignedRequests.length}</li>
                  <li>Tasks: {tasks.length}</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}