import React from 'react';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Calendar, Clock, User, MapPin, AlertCircle } from 'lucide-react';
import { DemoRequest, Task } from '../App';
import { timeSlots, culinaryTeamMembers } from '../data/mockData';
import { format, addDays, isSameDay, parseISO } from 'date-fns';

interface TeamScheduleGridProps {
  weekStart: Date;
  assignedRequests: DemoRequest[];
  assignedTasks: Task[];
  onSlotClick: (team: number, slot: string) => void;
  onDragEnd: (requestId: string, teamId: number, slot: string) => void;
  onTaskDragEnd: (taskId: string, teamId: number, slot: string) => void;
  canEdit: boolean;
}

export function TeamScheduleGrid({
  weekStart,
  assignedRequests,
  assignedTasks,
  onSlotClick,
  onDragEnd,
  onTaskDragEnd,
  canEdit
}: TeamScheduleGridProps) {
  const teams = [1, 2, 3, 4, 5];
  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  const getItemsForSlot = (team: number, date: Date, timeSlot: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slotKey = `${dateStr}-${timeSlot}`;

    const requests = assignedRequests.filter(req => 
      req.assignedTeam === team && 
      req.assignedSlot === slotKey
    );

    const tasks = assignedTasks.filter(task => 
      task.assignedTeam === team && 
      task.assignedSlot === slotKey
    );

    return { requests, tasks, totalItems: requests.length + tasks.length };
  };

  const isSlotOccupied = (team: number, date: Date, timeSlot: string) => {
    const { totalItems } = getItemsForSlot(team, date, timeSlot);
    return totalItems > 0;
  };

  const getTeamMembers = (teamId: number) => {
    // Distribute team members across teams
    const membersPerTeam = Math.ceil(culinaryTeamMembers.length / 5);
    const startIndex = (teamId - 1) * membersPerTeam;
    const endIndex = Math.min(startIndex + membersPerTeam, culinaryTeamMembers.length);
    return culinaryTeamMembers.slice(startIndex, endIndex);
  };

  const getItemTypeColor = (type: string) => {
    const colors = {
      demo: 'bg-green-100 text-green-800 border-green-200',
      deployment: 'bg-blue-100 text-blue-800 border-blue-200',
      recipe_development: 'bg-purple-100 text-purple-800 border-purple-200',
      videoshoot: 'bg-orange-100 text-orange-800 border-orange-200',
      event: 'bg-pink-100 text-pink-800 border-pink-200',
      device_testing: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const handleDrop = (e: React.DragEvent, team: number, slot: string) => {
    if (!canEdit) return;
    
    e.preventDefault();
    
    // Check if slot is already occupied - let parent handle the feedback
    const [dateStr, timeSlot] = slot.split('-').slice(0, 4); // Handle date format properly
    const date = new Date(dateStr + 'T00:00:00');
    const time = slot.split('-').slice(3).join('-');
    
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    
    if (data.type === 'request') {
      onDragEnd(data.id, team, slot);
    } else if (data.type === 'task') {
      onTaskDragEnd(data.id, team, slot);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (canEdit) {
      e.preventDefault();
    }
  };

  const handleSlotClick = (team: number, slot: string) => {
    if (!canEdit) return;
    
    onSlotClick(team, slot);
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1200px]">
        {/* Header */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          <div className="p-3 font-medium text-center bg-gray-100 rounded">
            Team
          </div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className="p-3 font-medium text-center bg-gray-100 rounded">
              <div>{format(day, 'EEE')}</div>
              <div className="text-sm text-gray-600">{format(day, 'MMM d')}</div>
            </div>
          ))}
        </div>

        {/* Teams and Time Slots */}
        {teams.map(team => (
          <div key={team} className="mb-6">
            <div className="mb-2">
              <h3 className="font-medium">Team {team}</h3>
              <div className="flex flex-wrap gap-1 text-sm text-gray-600">
                {getTeamMembers(team).map(member => (
                  <Badge key={member} variant="outline" className="text-xs">
                    {member}
                  </Badge>
                ))}
              </div>
            </div>

            {timeSlots.map(timeSlot => (
              <div key={timeSlot} className="grid grid-cols-7 gap-2 mb-2">
                <div className="p-2 text-center bg-gray-50 rounded text-sm font-medium">
                  {timeSlot}
                </div>
                {weekDays.map(day => {
                  const { requests, tasks, totalItems } = getItemsForSlot(team, day, timeSlot);
                  const hasItems = totalItems > 0;
                  const isOccupied = isSlotOccupied(team, day, timeSlot);

                  return (
                    <div
                      key={`${team}-${day.toISOString()}-${timeSlot}`}
                      className={`min-h-[80px] p-2 border rounded transition-colors ${
                        hasItems 
                          ? 'bg-white border-gray-300' 
                          : canEdit 
                            ? 'hover:bg-gray-50 bg-gray-25 border-gray-200 cursor-pointer' 
                            : 'bg-gray-25 border-gray-200'
                      } ${isOccupied && canEdit ? 'ring-1 ring-blue-200' : ''}`}
                      onClick={() => canEdit && handleSlotClick(team, `${format(day, 'yyyy-MM-dd')}-${timeSlot}`)}
                      onDrop={(e) => handleDrop(e, team, `${format(day, 'yyyy-MM-dd')}-${timeSlot}`)}
                      onDragOver={handleDragOver}
                    >
                      <div className="space-y-1">
                        {/* Show only one item since we enforce single task per slot */}
                        {requests.map(request => (
                          <div
                            key={request.id}
                            className={`p-2 rounded border text-xs ${getItemTypeColor(request.type)}`}
                          >
                            <div className="font-medium truncate">{request.clientName}</div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs opacity-75">
                                <Clock className="size-3" />
                                {request.demoTime}
                              </div>
                              {request.specialTag && (
                                <Badge variant="secondary" className="text-xs">
                                  {request.specialTag}
                                </Badge>
                              )}
                            </div>
                            {request.status === 'completed' && (
                              <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                                <div className="size-2 bg-green-500 rounded-full"></div>
                                Completed
                              </div>
                            )}
                            {request.status === 'in_progress' && (
                              <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                                <div className="size-2 bg-blue-500 rounded-full animate-pulse"></div>
                                In Progress
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {tasks.map(task => (
                          <div
                            key={task.id}
                            className={`p-2 rounded border text-xs ${getItemTypeColor(task.type)}`}
                          >
                            <div className="font-medium truncate">{task.title}</div>
                            <div className="flex items-center gap-1 text-xs opacity-75">
                              <Clock className="size-3" />
                              {task.time}
                            </div>
                            {task.clientName && (
                              <div className="text-xs text-gray-600 truncate">
                                Client: {task.clientName}
                              </div>
                            )}
                            {task.status === 'completed' && (
                              <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                                <div className="size-2 bg-green-500 rounded-full"></div>
                                Completed
                              </div>
                            )}
                            {task.status === 'in_progress' && (
                              <div className="flex items-center gap-1 text-xs text-blue-600 mt-1">
                                <div className="size-2 bg-blue-500 rounded-full animate-pulse"></div>
                                In Progress
                              </div>
                            )}
                          </div>
                        ))}

                        {!hasItems && canEdit && (
                          <div className="text-xs text-gray-400 text-center py-6">
                            Drop task here or click to add
                          </div>
                        )}
                        
                        {!hasItems && !canEdit && (
                          <div className="text-xs text-gray-300 text-center py-6">
                            Available
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      {canEdit && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="size-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <div className="font-medium">Single Task Constraint</div>
              <div>Each team can only have one task per time slot. Drag and drop tasks from the left panel or click on empty slots to add tasks.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}