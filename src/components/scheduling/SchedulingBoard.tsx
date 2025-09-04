import { useState, useCallback } from 'react';
import { Task, Team, TaskStatus } from '../../types/Task';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, Clock, MapPin, Video, Users, Plus, RefreshCw } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';

interface SchedulingBoardProps {
  tasks: Task[];
  teams: Team[];
  onTaskUpdate: (task: Task) => void;
  onTaskAssign: (taskId: string, teamId: number, memberIds: string[]) => void;
  isEditable: boolean;
}

export function SchedulingBoard({ 
  tasks, 
  teams, 
  onTaskUpdate, 
  onTaskAssign, 
  isEditable 
}: SchedulingBoardProps) {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Generate time slots (9 AM to 8 PM, 2-hour slots)
  const timeSlots = [
    { start: '09:00', end: '11:00', label: '9:00 AM - 11:00 AM' },
    { start: '11:00', end: '13:00', label: '11:00 AM - 1:00 PM' },
    { start: '13:00', end: '15:00', label: '1:00 PM - 3:00 PM' },
    { start: '15:00', end: '17:00', label: '3:00 PM - 5:00 PM' },
    { start: '17:00', end: '19:00', label: '5:00 PM - 7:00 PM' },
    { start: '19:00', end: '20:00', label: '7:00 PM - 8:00 PM' }
  ];

  // Generate week days (Monday to Saturday)
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  const getTasksForSlot = (date: string, timeSlot: string) => {
    return tasks.filter(task => 
      task.scheduledDate === date && 
      task.scheduledTime === timeSlot &&
      task.status !== TaskStatus.CANCELLED
    );
  };

  const handleDrop = useCallback((e: React.DragEvent, date: string, timeSlot: string, teamId: number) => {
    if (!isEditable) return;
    
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find(t => t.id === taskId);
    
    if (task) {
      const updatedTask = {
        ...task,
        scheduledDate: date,
        scheduledTime: timeSlot,
        assignedTeam: teamId,
        status: TaskStatus.ASSIGNED
      };
      onTaskUpdate(updatedTask);
    }
  }, [tasks, onTaskUpdate, isEditable]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const getTeamColor = (teamId: number) => {
    const colors = [
      'bg-blue-100 border-blue-300',
      'bg-green-100 border-green-300',
      'bg-purple-100 border-purple-300',
      'bg-yellow-100 border-yellow-300',
      'bg-pink-100 border-pink-300'
    ];
    return colors[teamId - 1] || 'bg-gray-100 border-gray-300';
  };

  const handleCreateTask = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setShowCreateTask(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-semibold">Scheduling Board</h2>
          <Select value={format(selectedWeek, 'yyyy-MM-dd')} onValueChange={(value) => setSelectedWeek(new Date(value))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 8 }, (_, i) => {
                const date = addDays(new Date(), i * 7 - 14);
                return (
                  <SelectItem key={i} value={format(date, 'yyyy-MM-dd')}>
                    Week of {format(date, 'MMM dd, yyyy')}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Google Sheets
          </Button>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
            Demos/Deployments
          </Badge>
        </div>
      </div>

      {/* Team Headers */}
      <div className="grid grid-cols-6 gap-4">
        {teams.map((team) => (
          <Card key={team.id} className={`${getTeamColor(team.id)}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{team.name}</CardTitle>
              <div className="flex flex-wrap gap-1">
                {team.members.map((member) => (
                  <Badge key={member.id} variant="outline" className="text-xs">
                    {member.name}
                  </Badge>
                ))}
              </div>
            </CardHeader>
          </Card>
        ))}
        <Card className="bg-gray-50 border-gray-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Unassigned</CardTitle>
            <p className="text-sm text-gray-600">Pending requests</p>
          </CardHeader>
        </Card>
      </div>

      {/* Schedule Grid */}
      <div className="space-y-4">
        {weekDays.map((day) => (
          <div key={format(day, 'yyyy-MM-dd')} className="space-y-2">
            <div className="flex items-center space-x-2 p-4 bg-white rounded-lg shadow-sm border">
              <Calendar className="w-5 h-5 text-gray-500" />
              <h3 className="font-medium">{format(day, 'EEEE, MMM dd, yyyy')}</h3>
            </div>
            
            {timeSlots.map((slot) => (
              <div key={slot.start} className="grid grid-cols-7 gap-4">
                <div className="flex items-center p-3 bg-gray-50 rounded-lg border">
                  <Clock className="w-4 h-4 text-gray-500 mr-2" />
                  <span className="text-sm font-medium">{slot.label}</span>
                </div>
                
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className={`min-h-[100px] p-2 rounded-lg border-2 border-dashed ${getTeamColor(team.id)} ${
                      isEditable ? 'cursor-pointer hover:opacity-80' : ''
                    }`}
                    onDrop={(e) => handleDrop(e, format(day, 'yyyy-MM-dd'), slot.start, team.id)}
                    onDragOver={handleDragOver}
                  >
                    {getTasksForSlot(format(day, 'yyyy-MM-dd'), slot.start)
                      .filter(task => task.assignedTeam === team.id)
                      .map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          team={team}
                          onTaskUpdate={onTaskUpdate}
                          isDraggable={isEditable}
                        />
                      ))}
                    
                    {isEditable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 text-gray-500 hover:text-gray-700"
                        onClick={() => handleCreateTask(format(day, 'yyyy-MM-dd'), slot.start)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Task
                      </Button>
                    )}
                  </div>
                ))}
                
                {/* Unassigned column */}
                <div
                  className="min-h-[100px] p-2 rounded-lg border-2 border-dashed bg-gray-50 border-gray-300"
                  onDrop={(e) => handleDrop(e, format(day, 'yyyy-MM-dd'), slot.start, 0)}
                  onDragOver={handleDragOver}
                >
                  {getTasksForSlot(format(day, 'yyyy-MM-dd'), slot.start)
                    .filter(task => !task.assignedTeam)
                    .map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onTaskUpdate={onTaskUpdate}
                        isDraggable={isEditable}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        initialDate={selectedDate}
        initialTime={selectedTime}
        onTaskCreate={(task) => {
          onTaskUpdate(task);
          setShowCreateTask(false);
        }}
      />
    </div>
  );
}