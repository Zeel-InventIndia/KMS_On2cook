import { useState } from 'react';
import { Task, Team, TaskStatus, TaskType } from '../../types/Task';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Users, Search, Filter, RefreshCw, MapPin, Video, Clock, User } from 'lucide-react';
import { mockGoogleSheetsData } from '../../data/mockData';

interface PendingRequestsProps {
  tasks: Task[];
  teams: Team[];
  onTaskUpdate: (task: Task) => void;
  onTaskAssign: (taskId: string, teamId: number, memberIds: string[]) => void;
}

export function PendingRequests({ tasks, teams, onTaskUpdate, onTaskAssign }: PendingRequestsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Get pending tasks (not assigned or planned)
  const pendingTasks = tasks.filter(task => 
    [TaskStatus.PLANNED, TaskStatus.RESCHEDULED].includes(task.status)
  );

  // Filter tasks based on search and filters
  const filteredTasks = pendingTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.salesRep?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesType = filterType === 'all' || task.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleAssignTask = (taskId: string, teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      onTaskAssign(taskId, teamId, team.members.map(m => m.id));
      // Update task status to assigned
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        onTaskUpdate({ 
          ...task, 
          status: TaskStatus.ASSIGNED, 
          assignedTeam: teamId,
          assignedMembers: team.members.map(m => m.id),
          updatedAt: new Date().toISOString() 
        });
      }
    }
  };

  const syncGoogleSheets = () => {
    // Simulate syncing Google Sheets data
    console.log('Syncing with Google Sheets...');
    // In real implementation, this would fetch from Google Sheets API
    mockGoogleSheetsData.forEach(sheetData => {
      if (sheetData.leadStatus === 'demo planned') {
        const newTask: Task = {
          id: `gs-${sheetData.row}`,
          type: TaskType.DEMO,
          title: `Demo for ${sheetData.clientName}`,
          clientName: sheetData.clientName,
          clientMobile: sheetData.clientMobile,
          clientEmail: sheetData.clientEmail,
          scheduledDate: sheetData.demoDate,
          scheduledTime: sheetData.demoTime,
          duration: 2,
          salesRep: sheetData.salesRep,
          recipes: sheetData.recipes.split(',').map(r => r.trim()),
          status: TaskStatus.PLANNED,
          createdBy: 'google-sheets',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          googleSheetRow: sheetData.row
        };
        onTaskUpdate(newTask);
      }
    });
  };

  const getTaskIcon = (type: TaskType) => {
    switch (type) {
      case TaskType.DEMO:
        return <MapPin className="w-5 h-5 text-blue-500" />;
      case TaskType.DEPLOYMENT:
        return <Users className="w-5 h-5 text-green-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.PLANNED:
        return 'bg-blue-100 text-blue-800';
      case TaskStatus.RESCHEDULED:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Pending Requests</h2>
        <Button onClick={syncGoogleSheets} className="bg-green-600 hover:bg-green-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync Google Sheets
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tasks, clients, or sales reps..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value={TaskStatus.PLANNED}>Planned</SelectItem>
                <SelectItem value={TaskStatus.RESCHEDULED}>Rescheduled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value={TaskType.DEMO}>Demo</SelectItem>
                <SelectItem value={TaskType.DEPLOYMENT}>Deployment</SelectItem>
                <SelectItem value={TaskType.RECIPE_DEVELOPMENT}>Recipe Development</SelectItem>
                <SelectItem value={TaskType.VIDEOSHOOT}>Videoshoot</SelectItem>
                <SelectItem value={TaskType.EVENT}>Event</SelectItem>
                <SelectItem value={TaskType.DEVICE_TESTING}>Device Testing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTasks.map((task) => (
          <Card key={task.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getTaskIcon(task.type)}
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                </div>
                <Badge variant="secondary" className={getStatusColor(task.status)}>
                  {task.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {task.clientName && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{task.clientName}</span>
                  {task.leadTag && (
                    <Badge variant="outline" className="text-xs">
                      {task.leadTag}
                    </Badge>
                  )}
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                <p><strong>Date:</strong> {new Date(task.scheduledDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {task.scheduledTime}</p>
                <p><strong>Duration:</strong> {task.duration} hours</p>
                {task.salesRep && <p><strong>Sales Rep:</strong> {task.salesRep}</p>}
              </div>
              
              {task.demoMode && (
                <div className="flex items-center space-x-1 text-sm">
                  {task.demoMode === 'virtual' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                  <span className="capitalize">{task.demoMode} Demo</span>
                </div>
              )}
              
              {task.recipes && task.recipes.length > 0 && (
                <div className="text-sm text-gray-600">
                  <strong>Recipes:</strong> {task.recipes.slice(0, 2).join(', ')}
                  {task.recipes.length > 2 && ` +${task.recipes.length - 2} more`}
                </div>
              )}
              
              {task.remarks && (
                <div className="text-sm text-gray-600">
                  <strong>Notes:</strong> {task.remarks.substring(0, 100)}
                  {task.remarks.length > 100 && '...'}
                </div>
              )}
              
              <div className="pt-2">
                <Select onValueChange={(teamId) => handleAssignTask(task.id, parseInt(teamId))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name} ({team.members.length} members)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
            <p className="text-gray-600">All requests have been assigned or there are no new requests to display.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}