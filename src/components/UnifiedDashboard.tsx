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
  Bug,
  Settings
} from 'lucide-react';
import { User, DemoRequest, Task, TEAM_GROUPS, TIME_SLOTS, formatDateSafely } from '../App';
import { RecipeRepositoryV2 } from './RecipeRepositoryV2';
import { RecipeRepositoryTest } from './RecipeRepositoryTest';
import { RecipeImportManager } from './RecipeImportManager';
import { DemoDetailModal } from './DemoDetailModal';
import { CreateTaskModal } from './CreateTaskModal';
import { TeamManagement } from './teams/TeamManagement';

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
  csvError
}: UnifiedDashboardProps) {
  const [selectedDemo, setSelectedDemo] = useState<DemoRequest | null>(null);
  const [showDemoDetail, setShowDemoDetail] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showTeamManagement, setShowTeamManagement] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState<string>('all');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [draggedRequest, setDraggedRequest] = useState<DemoRequest | null>(null);
  const [dropTarget, setDropTarget] = useState<{teamId: number, timeSlot: string} | null>(null);

  // Get unassigned requests - include rescheduled and cancelled demos
  const getUnassignedRequests = () => {
    console.log('🔍 DASHBOARD DEBUG - Getting unassigned requests from', allDemoRequests.length, 'total requests');
    
    const filtered = allDemoRequests
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
        
        // Regular unassigned demos - FIXED: Show planned demos even without recipes
        // so presales team can add recipes to them
        const isPlanned = req.leadStatus === 'demo_planned';
        const notAssigned = !req.assignedTeam;
        const shouldShow = isPlanned && notAssigned;
        
        if (isPlanned) {
          console.log(`🔍 DASHBOARD DEBUG - Planned ${req.clientName}: recipes=${req.recipes.length}, assignedTeam=${req.assignedTeam}, shouldShow=${shouldShow} (FIXED: no longer requires recipes)`);
        }
        
        return shouldShow;
      })
      .sort((a, b) => new Date(a.demoDate).getTime() - new Date(b.demoDate).getTime());
    
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

  // Time slot validation helper
  const isTimeSlotCompatible = (demoTime: string | undefined, targetSlot: string): boolean => {
    if (!demoTime) return true; // If no demo time specified, allow any slot
    
    // Parse demo time (e.g., "10:00 AM", "2:00 PM")
    const demoTimeMatch = demoTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!demoTimeMatch) return true; // If can't parse, allow (fallback)
    
    let demoHour = parseInt(demoTimeMatch[1]);
    const demoMinutes = parseInt(demoTimeMatch[2]);
    const demoAmPm = demoTimeMatch[3].toUpperCase();
    
    // Convert to 24-hour format
    if (demoAmPm === 'PM' && demoHour !== 12) {
      demoHour += 12;
    } else if (demoAmPm === 'AM' && demoHour === 12) {
      demoHour = 0;
    }
    
    const demoTimeIn24 = demoHour * 60 + demoMinutes; // Convert to minutes since midnight
    
    // Parse target slot (e.g., "1:00 PM - 3:00 PM")
    const slotMatch = targetSlot.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!slotMatch) return true; // If can't parse, allow (fallback)
    
    let startHour = parseInt(slotMatch[1]);
    const startMinutes = parseInt(slotMatch[2]);
    const startAmPm = slotMatch[3].toUpperCase();
    
    let endHour = parseInt(slotMatch[4]);
    const endMinutes = parseInt(slotMatch[5]);
    const endAmPm = slotMatch[6].toUpperCase();
    
    // Convert start time to 24-hour format
    if (startAmPm === 'PM' && startHour !== 12) {
      startHour += 12;
    } else if (startAmPm === 'AM' && startHour === 12) {
      startHour = 0;
    }
    
    // Convert end time to 24-hour format
    if (endAmPm === 'PM' && endHour !== 12) {
      endHour += 12;
    } else if (endAmPm === 'AM' && endHour === 12) {
      endHour = 0;
    }
    
    const slotStartIn24 = startHour * 60 + startMinutes;
    const slotEndIn24 = endHour * 60 + endMinutes;
    
    // Check if demo time falls within the slot with 30-minute buffer on either side
    const bufferMinutes = 30;
    const isCompatible = demoTimeIn24 >= (slotStartIn24 - bufferMinutes) && 
                        demoTimeIn24 <= (slotEndIn24 + bufferMinutes);
    
    if (!isCompatible) {
      console.log(`⏰ Time validation: ${demoTime} is not compatible with ${targetSlot}`, {
        demoTimeIn24,
        slotStartIn24,
        slotEndIn24,
        bufferMinutes
      });
    }
    
    return isCompatible;
  };

  // Drag and drop handlers for head chef scheduling
  const handleDragStart = (e: React.DragEvent, request: DemoRequest) => {
    if (user.role !== 'head_chef') return;
    
    setDraggedRequest(request);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', request.id);
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedRequest(null);
    setDropTarget(null);
    
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, teamId: number, timeSlot: string) => {
    if (!draggedRequest || user.role !== 'head_chef') return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Check if slot is available and time-compatible
    const existingDemo = getAssignedDemo(teamId, timeSlot);
    const isTimeCompatible = isTimeSlotCompatible(draggedRequest.demoTime, timeSlot);
    
    if (!existingDemo && isTimeCompatible) {
      setDropTarget({ teamId, timeSlot });
    } else if (!isTimeCompatible) {
      // Visual feedback for incompatible time
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drop target if we're actually leaving the drop zone
    if (e.currentTarget === e.target) {
      setDropTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, teamId: number, timeSlot: string) => {
    e.preventDefault();
    
    if (!draggedRequest || user.role !== 'head_chef') return;
    
    // Check if slot is available
    const existingDemo = getAssignedDemo(teamId, timeSlot);
    if (existingDemo) {
      console.warn('Cannot drop - slot already occupied');
      return;
    }
    
    // Check if time is compatible
    const isTimeCompatible = isTimeSlotCompatible(draggedRequest.demoTime, timeSlot);
    if (!isTimeCompatible) {
      console.warn(`Cannot drop - demo time ${draggedRequest.demoTime} is not compatible with slot ${timeSlot}`);
      
      // Show user-friendly error message
      const errorMsg = `⏰ Time Conflict: ${draggedRequest.clientName}'s demo is scheduled for ${draggedRequest.demoTime}, which doesn't fit in the ${timeSlot} slot.`;
      
      alert(errorMsg);
      
      // Reset drag state
      setDraggedRequest(null);
      setDropTarget(null);
      return;
    }
    
    // Update the request with team and slot assignment
    const updatedRequest: DemoRequest = {
      ...draggedRequest,
      assignedTeam: teamId,
      assignedSlot: timeSlot,
      status: 'assigned'
    };
    
    onUpdateDemoRequest(updatedRequest);
    
    // Reset drag state
    setDraggedRequest(null);
    setDropTarget(null);
    
    console.log(`✅ Assigned ${draggedRequest.clientName} to Team ${teamId} at ${timeSlot}`);
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
              <Button 
                variant="outline" 
                onClick={() => setShowDebugPanel(true)}
                size="sm"
              >
                <Bug className="h-4 w-4 mr-2" />
                Debug
              </Button>
              {user.role === 'head_chef' && (
                <Button 
                  variant="outline"
                  onClick={() => setShowTeamManagement(true)}
                  size="sm"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Teams
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

      {/* CSV Error Alert */}
      {csvError && (
        <div className="container mx-auto px-4 pt-4">
          <Alert variant={dataSource === 'mock' ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{dataSource === 'mock' ? 'Data Loading Notice:' : 'Data Loading Error:'}</strong> {csvError}
              {dataSource === 'mock' && (
                <div className="mt-2 text-sm">
                  The application is now running with sample data. You can still test all features normally.
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content - Two Horizontal Halves Layout */}
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6 h-[calc(100vh-200px)]">
          
          {/* Top Half - Unassigned/Pending Requests */}
          <div className="h-1/2">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Unassigned Requests ({unassignedRequests.length}) - Needs Recipes & Team Assignment
                  {user.role === 'head_chef' && unassignedRequests.length > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                      ⤵️ Drag to Schedule
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                {unassignedRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No unassigned requests</p>
                    <p className="text-sm">All planned demos have been assigned to teams</p>
                    {user.role === 'head_chef' && (
                      <p className="text-xs mt-2 text-blue-600">
                        💡 When new requests arrive, drag them to the schedule to assign teams and time slots
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {unassignedRequests.map((demo) => (
                      <div
                        key={demo.id}
                        className={`border rounded-lg p-4 space-y-3 bg-white hover:shadow-md transition-shadow ${
                          user.role === 'head_chef' ? 'cursor-move' : ''
                        } ${draggedRequest?.id === demo.id ? 'opacity-50' : ''}`}
                        draggable={user.role === 'head_chef'}
                        onDragStart={(e) => handleDragStart(e, demo)}
                        onDragEnd={handleDragEnd}
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
                                <strong>⚠️ Action Required:</strong> No recipes added yet. Click to view and add recipes.
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {demo.recipes.map((recipe, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {recipe}
                                  </Badge>
                                ))}
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

                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Half - Schedule and Repository */}
          <div className="h-1/2">
            <Tabs defaultValue="schedule" className="h-full flex flex-col">
              <TabsList className={`grid w-full ${user.role === 'presales' ? 'grid-cols-4' : 'grid-cols-2'}`}>
                <TabsTrigger value="schedule">Kitchen Schedule</TabsTrigger>
                <TabsTrigger value="recipes">Recipe Repository</TabsTrigger>
                {user.role === 'presales' && (
                  <>
                    <TabsTrigger value="recipe-manager">Recipe Manager</TabsTrigger>
                    <TabsTrigger value="recipe-test">Backend Test</TabsTrigger>
                  </>
                )}
              </TabsList>

              {/* Kitchen Schedule Tab - Tabular Format */}
              <TabsContent value="schedule" className="flex-1 mt-4">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Kitchen Schedule - Time vs Teams
                          {user.role === 'head_chef' && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              🎯 Drag & Drop Enabled
                            </Badge>
                          )}
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
                                <div className="flex items-center justify-center gap-2">
                                  <span>{team.name}</span>
                                  {user.role === 'head_chef' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setShowTeamManagement(true)}
                                      className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
                                    >
                                      <Settings className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground font-normal mt-1">
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
                                const dragCanDrop = !assignedDemo && draggedRequest && 
                                                  isTimeSlotCompatible(draggedRequest.demoTime, timeSlot);

                                return (
                                  <td
                                    key={team.id}
                                    className={`border-l p-2 text-center text-sm ${
                                      isDropTarget 
                                        ? 'bg-blue-100 border-blue-300' 
                                        : assignedDemo 
                                          ? 'bg-green-50' 
                                          : 'hover:bg-gray-50'
                                    } ${
                                      user.role === 'head_chef' && dragCanDrop 
                                        ? 'cursor-pointer' 
                                        : ''
                                    }`}
                                    onDragOver={(e) => handleDragOver(e, team.id, timeSlot)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, team.id, timeSlot)}
                                  >
                                    {assignedDemo ? (
                                      <div className="space-y-1">
                                        <div className="font-medium text-xs">
                                          {assignedDemo.clientName}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {formatDate(assignedDemo.demoDate)}
                                        </div>
                                        <Badge 
                                          className={`${getStatusColor(assignedDemo.leadStatus)} text-xs px-1 py-0`}
                                        >
                                          {assignedDemo.leadStatus === 'demo_given' ? '✓ Done' : 
                                           assignedDemo.leadStatus === 'demo_planned' ? '● Planned' : 
                                           assignedDemo.leadStatus === 'demo_rescheduled' ? '⚠ Rescheduled' : 
                                           assignedDemo.leadStatus}
                                        </Badge>
                                        <div className="mt-1">
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleViewDemo(assignedDemo)}
                                            className="h-6 text-xs px-2"
                                          >
                                            <Eye className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-muted-foreground py-4">
                                        {user.role === 'head_chef' && draggedRequest && dragCanDrop ? (
                                          <div className="text-blue-600 font-medium">
                                            📍 Drop Here
                                          </div>
                                        ) : (
                                          'Available'
                                        )}
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
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ChefHat className="h-5 w-5" />
                      Recipe Repository
                      {user.role === 'presales' && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                          🍳 Add recipes to demos
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto">
                    <RecipeRepositoryV2 user={user} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Recipe Manager Tab - Only for presales */}
              {user.role === 'presales' && (
                <TabsContent value="recipe-manager" className="flex-1 mt-4">
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Recipe Manager
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          Import & Manage Recipes
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                      <RecipeImportManager user={user} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Backend Test Tab - Only for presales */}
              {user.role === 'presales' && (
                <TabsContent value="recipe-test" className="flex-1 mt-4">
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bug className="h-5 w-5" />
                        Backend Recipe Test
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                          Development Testing
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                      <RecipeRepositoryTest user={user} />
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showDemoDetail && selectedDemo && (
        <DemoDetailModal
          demo={selectedDemo}
          user={user}
          onClose={() => setShowDemoDetail(false)}
          onUpdate={onUpdateDemoRequest}
        />
      )}

      {showCreateTask && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onCreate={handleCreateTask}
        />
      )}

      {showTeamManagement && user.role === 'head_chef' && (
        <TeamManagement
          onClose={() => setShowTeamManagement(false)}
        />
      )}
    </div>
  );
}