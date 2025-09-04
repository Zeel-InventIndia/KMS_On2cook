import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  Calendar, 
  Clock, 
  Users, 
  Eye,
  ChefHat,
  BookOpen
} from 'lucide-react';
import { User, DemoRequest, Task, TEAM_GROUPS, TIME_SLOTS } from '../App';
import { RecipeRepositoryV2 } from './RecipeRepositoryV2';

interface NewKitchenTeamDashboardProps {
  user: User;
  demoRequests: DemoRequest[];
  tasks: Task[];
  onUpdateDemoRequest: (request: DemoRequest) => void;
  onUpdateTask: (task: Task) => void;
  onLogout: () => void;
}

interface DemoDetailModalProps {
  demo: DemoRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

function DemoDetailModal({ demo, isOpen, onClose }: DemoDetailModalProps) {
  if (!demo) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Demo Details - {demo.clientName}</DialogTitle>
          <DialogDescription>
            Complete demo information and requirements
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Client Name</label>
              <div className="text-sm bg-gray-50 p-2 rounded">{demo.clientName}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <div className="text-sm bg-gray-50 p-2 rounded">{demo.clientMobile}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <div className="text-sm bg-gray-50 p-2 rounded">{formatDate(demo.demoDate)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <div className="text-sm bg-gray-50 p-2 rounded">{demo.demoTime}</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <Badge className={`${
              demo.leadStatus === 'demo_planned' ? 'bg-green-100 text-green-800' :
              demo.leadStatus === 'demo_rescheduled' ? 'bg-yellow-100 text-yellow-800' :
              demo.leadStatus === 'demo_cancelled' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {demo.leadStatus.replace('_', ' ')}
            </Badge>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Assigned Recipes</label>
            <div className="space-y-2">
              {demo.recipes.length > 0 ? (
                demo.recipes.map((recipe, index) => (
                  <div key={index} className="text-sm bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                    {recipe}
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No recipes assigned</div>
              )}
            </div>
          </div>

          {demo.notes && (
            <div>
              <label className="block text-sm font-medium mb-1">Special Notes</label>
              <div className="text-sm bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                {demo.notes}
              </div>
            </div>
          )}

          {demo.assignedSlot && (
            <div>
              <label className="block text-sm font-medium mb-1">Time Slot</label>
              <div className="text-sm bg-green-50 p-2 rounded">{demo.assignedSlot}</div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NewKitchenTeamDashboard({
  user,
  demoRequests,
  tasks,
  onUpdateDemoRequest,
  onUpdateTask,
  onLogout
}: NewKitchenTeamDashboardProps) {
  const [selectedDemo, setSelectedDemo] = useState<DemoRequest | null>(null);
  const [showDemoDetail, setShowDemoDetail] = useState(false);

  // Get user's team assignment
  const userTeam = TEAM_GROUPS.find(team => 
    team.members.some(member => member.toLowerCase() === user.name.toLowerCase())
  );

  // Filter demos and tasks assigned to this user or their team
  const myScheduleItems = demoRequests.filter(req => 
    (req.assignedMembers && req.assignedMembers.includes(user.name)) ||
    (req.assignedTeam === userTeam?.id) ||
    (req.assignedTeam === user.team)
  );

  const myTasks = tasks.filter(task => 
    (task.assignedMembers && task.assignedMembers.includes(user.name)) ||
    (task.assignedTeam === userTeam?.id) ||
    (task.assignedTeam === user.team)
  );

  const handleViewDemo = (demo: DemoRequest) => {
    setSelectedDemo(demo);
    setShowDemoDetail(true);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'demo_planned': return 'bg-green-100 text-green-800 border-green-200';
      case 'demo_rescheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'demo_cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper function to get assigned demo for a specific time slot
  const getMyAssignedDemo = (timeSlot: string) => {
    return myScheduleItems.find(req => req.assignedSlot === timeSlot);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Kitchen Team Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user.name} • {userTeam ? `${userTeam.name} Member` : 'Kitchen Team Member'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schedule">My Schedule</TabsTrigger>
            <TabsTrigger value="recipes">Recipe Repository</TabsTrigger>
          </TabsList>

          {/* My Schedule Tab */}
          <TabsContent value="schedule">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Scheduled Demos</CardTitle>
                    <ChefHat className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{myScheduleItems.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Assigned to you
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tasks</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{myTasks.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Additional tasks
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Team</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{userTeam ? userTeam.name : 'N/A'}</div>
                    <p className="text-xs text-muted-foreground">
                      {userTeam ? userTeam.members.filter(m => m !== user.name).join(', ') : 'Not assigned'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Personal Schedule Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    My Daily Schedule (Time Slots)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {myScheduleItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No demos scheduled</p>
                      <p className="text-sm">Check back later for assignments</p>
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-4 font-medium text-sm">Time Slot</th>
                            <th className="text-left p-4 font-medium text-sm">Demo Details</th>
                            <th className="text-left p-4 font-medium text-sm">Recipes</th>
                            <th className="text-center p-4 font-medium text-sm">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {TIME_SLOTS.map((timeSlot, timeIndex) => {
                            const assignedDemo = getMyAssignedDemo(timeSlot);
                            
                            return (
                              <tr key={timeSlot} className={timeIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                <td className="p-4 font-medium text-sm border-r">
                                  {timeSlot}
                                </td>
                                <td className="p-4 align-top">
                                  {assignedDemo ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-sm">
                                          {assignedDemo.clientName}
                                        </span>
                                        <Badge className={getStatusColor(assignedDemo.leadStatus)}>
                                          {assignedDemo.leadStatus.replace('_', ' ')}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground space-y-1">
                                        <div>{formatDate(assignedDemo.demoDate)} • {assignedDemo.demoTime}</div>
                                        <div>📞 {assignedDemo.clientMobile}</div>
                                        {assignedDemo.notes && (
                                          <div className="text-yellow-600 bg-yellow-50 p-2 rounded text-xs">
                                            <strong>Notes:</strong> {assignedDemo.notes}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 text-muted-foreground text-sm">
                                      Free Time
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 align-top">
                                  {assignedDemo ? (
                                    <div className="space-y-1">
                                      {assignedDemo.recipes.slice(0, 3).map((recipe, index) => (
                                        <div key={index} className="text-xs bg-blue-50 p-2 rounded border-l-2 border-blue-400">
                                          {recipe}
                                        </div>
                                      ))}
                                      {assignedDemo.recipes.length > 3 && (
                                        <div className="text-xs text-muted-foreground">
                                          +{assignedDemo.recipes.length - 3} more recipes
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 text-muted-foreground text-sm">
                                      -
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 text-center">
                                  {assignedDemo ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleViewDemo(assignedDemo)}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </Button>
                                  ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Tasks */}
              {myTasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Additional Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {myTasks.map((task) => (
                        <div key={task.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{task.title}</h4>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{task.date}</span>
                                <span>{task.time}</span>
                                <Badge variant="outline">{task.type}</Badge>
                              </div>
                            </div>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </div>
                          {task.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{task.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Recipe Repository Tab */}
          <TabsContent value="recipes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Recipe Repository
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <RecipeRepositoryV2 user={user} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Demo Detail Modal */}
      <DemoDetailModal
        demo={selectedDemo}
        isOpen={showDemoDetail}
        onClose={() => setShowDemoDetail(false)}
      />
    </div>
  );
}