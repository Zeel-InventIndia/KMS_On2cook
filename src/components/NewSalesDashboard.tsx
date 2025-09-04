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
  Eye,
  Filter,
  AlertCircle,
  BookOpen,
  TrendingUp,
  User as UserIcon,
  Link,
  FolderOpen,
  CheckCircle
} from 'lucide-react';
import { User, DemoRequest, Task, TEAM_GROUPS, TIME_SLOTS, formatDateSafely } from '../App';
import { RecipeRepositoryV2 } from './RecipeRepositoryV2';
import { DemoDetailModal } from './DemoDetailModal';
import { getScheduleViewDemoRequests } from '../utils/helpers';

interface NewSalesDashboardProps {
  user: User;
  demoRequests: DemoRequest[];
  allDemoRequests: DemoRequest[];
  tasks: Task[];
  onUpdateDemoRequest: (request: DemoRequest) => void;
  onLogout: () => void;
  dataSource: 'csv' | 'csv-client';
  lastSheetsUpdate?: string | null;
  csvError?: string | null;
}

export function NewSalesDashboard({
  user,
  demoRequests,
  allDemoRequests,
  tasks,
  onUpdateDemoRequest,
  onLogout,
  dataSource,
  lastSheetsUpdate,
  csvError
}: NewSalesDashboardProps) {
  const [scheduleFilter, setScheduleFilter] = useState<string>('all');
  const [selectedDemo, setSelectedDemo] = useState<DemoRequest | null>(null);
  const [showDemoDetail, setShowDemoDetail] = useState(false);

  // Filter kitchen schedule based on selected filter - include demo_given
  const getFilteredSchedule = () => {
    const baseSchedule = getScheduleViewDemoRequests(allDemoRequests);
    
    switch (scheduleFilter) {
      case 'my_demos':
        return baseSchedule.filter(req => 
          req.salesRep.toLowerCase() === user.name.toLowerCase() && req.assignedTeam
        );
      case 'assigned':
        return baseSchedule.filter(req => req.assignedTeam);
      case 'pending':
        return baseSchedule.filter(req => !req.assignedTeam && req.recipes.length > 0);
      case 'demo_given':
        return baseSchedule.filter(req => req.leadStatus === 'demo_given');
      default:
        return baseSchedule;
    }
  };

  const filteredSchedule = getFilteredSchedule();

  // Calculate stats for sales dashboard
  const stats = {
    totalDemos: demoRequests.length,
    plannedDemos: demoRequests.filter(req => req.leadStatus === 'demo_planned').length,
    completedDemos: demoRequests.filter(req => req.leadStatus === 'demo_given').length,
    rescheduledDemos: demoRequests.filter(req => req.leadStatus === 'demo_rescheduled').length,
    withMedia: demoRequests.filter(req => req.leadStatus === 'demo_given' && (req.dropboxLink || req.mediaLink)).length
  };

  const formatDate = (dateString: string) => {
    return formatDateSafely(dateString, dateString);
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

  // Helper function to get assigned demo for a specific team and time slot
  const getAssignedDemo = (teamId: number, timeSlot: string) => {
    return filteredSchedule.find(req => req.assignedTeam === teamId && req.assignedSlot === timeSlot);
  };

  const handleViewDemo = (demo: DemoRequest) => {
    setSelectedDemo(demo);
    setShowDemoDetail(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Sales Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user.name} • Sales Representative
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

      {/* Main Content - Two Horizontal Halves */}
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6 h-[calc(100vh-200px)]">
          
          {/* Top Half - My Sales Demos */}
          <div className="h-1/2">
            <div className="grid grid-cols-4 gap-4 mb-4">
              {/* Stats Cards */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Demos</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDemos}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Planned</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.plannedDemos}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.completedDemos}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Media Available</CardTitle>
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.withMedia}</div>
                  <div className="text-xs text-muted-foreground">
                    of {stats.completedDemos} completed
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="h-[calc(100%-120px)] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  My Demo Pipeline ({demoRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <div className="space-y-3">
                  {demoRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No demos assigned to you</p>
                      <p className="text-sm">Check the Google Sheets for new leads</p>
                    </div>
                  ) : (
                    demoRequests.map((demo) => (
                      <div key={demo.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium">{demo.clientName}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(demo.demoDate)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {demo.demoTime}
                              </span>
                              <span>📞 {demo.clientMobile}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(demo.leadStatus)}>
                              {demo.leadStatus === 'demo_given' ? 'Demo Given ✓' : demo.leadStatus.replace('_', ' ')}
                            </Badge>
                            {demo.assignedTeam && (
                              <Badge variant="outline">
                                Team {demo.assignedTeam}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            <strong>Assigned to:</strong> {demo.assignee}
                          </div>
                          
                          {demo.recipes.length > 0 && (
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">
                                <strong>Demo Recipes ({demo.recipes.length}):</strong>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {demo.recipes.slice(0, 4).map((recipe, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {recipe}
                                  </Badge>
                                ))}
                                {demo.recipes.length > 4 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{demo.recipes.length - 4} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Enhanced Media Link Display for Demo Given */}
                          {demo.leadStatus === 'demo_given' && (demo.dropboxLink || demo.mediaLink) && (
                            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FolderOpen className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-700">Demo Media Available</span>
                                </div>
                                <a
                                  href={demo.dropboxLink || demo.mediaLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium"
                                >
                                  <Link className="h-3 w-3" />
                                  View Media
                                </a>
                              </div>
                              <div className="text-xs text-green-600 mt-1">
                                ✓ Media files uploaded and processed
                              </div>
                            </div>
                          )}
                        </div>

                        {demo.notes && (
                          <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                            <strong>Notes:</strong> {demo.notes}
                          </div>
                        )}

                        {demo.leadStatus === 'demo_given' ? (
                          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            <div>
                              <strong>Status:</strong> Demo completed successfully
                              {(demo.dropboxLink || demo.mediaLink) ? (
                                <div className="text-xs text-green-600 mt-1">✓ Media files available for review</div>
                              ) : (
                                <div className="text-xs text-orange-600 mt-1">⏳ Media upload pending</div>
                              )}
                            </div>
                          </div>
                        ) : demo.assignedTeam ? (
                          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                            <strong>Status:</strong> Kitchen team assigned - demo execution in progress
                          </div>
                        ) : demo.recipes.length > 0 ? (
                          <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                            <strong>Status:</strong> Recipes assigned - awaiting kitchen team assignment
                          </div>
                        ) : (
                          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            <strong>Status:</strong> Awaiting recipe selection by presales team
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Half - Kitchen Schedule and Recipe Repository */}
          <div className="h-1/2">
            <Tabs defaultValue="schedule" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="schedule">Kitchen Schedule</TabsTrigger>
                <TabsTrigger value="recipes">Recipe Repository</TabsTrigger>
              </TabsList>

              {/* Kitchen Schedule Tab - Tabular Format */}
              <TabsContent value="schedule" className="flex-1 mt-4">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Kitchen Schedule (Time vs Teams)
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <select
                          value={scheduleFilter}
                          onChange={(e) => setScheduleFilter(e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="all">All Demos</option>
                          <option value="my_demos">My Sales Demos</option>
                          <option value="assigned">All Assigned</option>
                          <option value="pending">Pending Assignment</option>
                          <option value="demo_given">Completed Demos</option>
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
                                
                                return (
                                  <td key={team.id} className="p-3 border-l min-h-[80px] align-top">
                                    {assignedDemo ? (
                                      <div className={`${
                                        assignedDemo.leadStatus === 'demo_given' 
                                          ? 'bg-blue-50 border border-blue-200' 
                                          : 'bg-green-50 border border-green-200'
                                      } rounded p-3 min-h-[60px] space-y-2 cursor-pointer hover:shadow-md transition-shadow`}
                                        onClick={() => handleViewDemo(assignedDemo)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className={`font-medium text-sm ${
                                            assignedDemo.leadStatus === 'demo_given'
                                              ? 'text-blue-900'
                                              : 'text-green-900'
                                          }`}>
                                            {assignedDemo.clientName}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            {assignedDemo.salesRep.toLowerCase() === user.name.toLowerCase() && (
                                              <Badge variant="outline" className="text-xs">
                                                My Sale
                                              </Badge>
                                            )}
                                            <Eye className="h-3 w-3 text-muted-foreground" />
                                          </div>
                                        </div>
                                        <div className={`text-xs ${
                                          assignedDemo.leadStatus === 'demo_given'
                                            ? 'text-blue-700'
                                            : 'text-green-700'
                                        }`}>
                                          Sales Rep: {assignedDemo.salesRep}
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
                                        Available
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
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Recipe Repository
                    </CardTitle>
                  </CardHeader>
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
        readOnly={false}
        showMediaSection={true}
      />
    </div>
  );
}