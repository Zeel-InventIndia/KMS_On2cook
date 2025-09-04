import React, { useEffect } from 'react';
import { Badge } from './ui/badge';
import { Clock, AlertCircle, Users, Settings } from 'lucide-react';
import { DemoRequest, Task } from '../App';
import { Team } from '../types/Task';
import { timeSlots } from '../data/mockData';
import { format } from 'date-fns';
import { useDragAutoScroll } from '../utils/useDragAutoScroll';

interface TodayScheduleGridProps {
  assignedRequests: DemoRequest[];
  assignedTasks: Task[];
  teams: Team[];
  onSlotClick: (team: number, slot: string) => void;
  onTeamClick?: (team: Team) => void;
  onDragEnd: (requestId: string, teamId: number, slot: string) => void;
  onTaskDragEnd: (taskId: string, teamId: number, slot: string) => void;
  canEdit: boolean;
}

export function TodayScheduleGrid({
  assignedRequests,
  assignedTasks,
  teams,
  onSlotClick,
  onTeamClick,
  onDragEnd,
  onTaskDragEnd,
  canEdit
}: TodayScheduleGridProps) {
  const teamIds = [1, 2, 3, 4, 5];
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const { startDragging, stopDragging } = useDragAutoScroll({
    scrollThreshold: 100,
    scrollSpeed: 20,
    enabled: canEdit
  });

  const getItemsForSlot = (team: number, timeSlot: string) => {
    const slotKey = `${todayStr}-${timeSlot}`;

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

  const isSlotOccupied = (team: number, timeSlot: string) => {
    const { totalItems } = getItemsForSlot(team, timeSlot);
    return totalItems > 0;
  };

  const getTeamData = (teamId: number) => {
    return teams.find(team => team.id === teamId) || {
      id: teamId,
      name: `Team ${teamId}`,
      members: []
    };
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

  const handleDrop = (e: React.DragEvent, team: number, timeSlot: string) => {
    if (!canEdit) return;
    
    e.preventDefault();
    
    const slot = `${todayStr}-${timeSlot}`;
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    
    if (data.type === 'request') {
      onDragEnd(data.id, team, slot);
    } else if (data.type === 'task') {
      onTaskDragEnd(data.id, team, slot);
    }

    // Stop auto-scroll when drop is complete
    stopDragging();
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (canEdit) {
      e.preventDefault();
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (canEdit) {
      e.preventDefault();
      // Start auto-scroll when entering a valid drop zone
      startDragging();
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only stop auto-scroll if we're actually leaving the drop zone area
    // Check if the related target is still within the grid
    const target = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as HTMLElement;
    
    if (!target.contains(relatedTarget)) {
      stopDragging();
    }
  };

  const handleSlotClick = (team: number, timeSlot: string) => {
    if (!canEdit) return;
    
    const slot = `${todayStr}-${timeSlot}`;
    onSlotClick(team, slot);
  };

  const handleTeamHeaderClick = (teamId: number) => {
    if (!canEdit || !onTeamClick) return;
    
    const teamData = getTeamData(teamId);
    onTeamClick(teamData);
  };

  // Add global drag leave handler to stop auto-scroll when leaving the document
  useEffect(() => {
    const handleDocumentDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) {
        stopDragging();
      }
    };

    const handleDocumentDragEnd = () => {
      stopDragging();
    };

    document.addEventListener('dragleave', handleDocumentDragLeave);
    document.addEventListener('dragend', handleDocumentDragEnd);

    return () => {
      document.removeEventListener('dragleave', handleDocumentDragLeave);
      document.removeEventListener('dragend', handleDocumentDragEnd);
    };
  }, [stopDragging]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header with date */}
        <div className="mb-4 text-center">
          <h2 className="text-lg font-medium text-gray-900">
            Today's Schedule - {format(today, 'EEEE, MMMM d, yyyy')}
          </h2>
        </div>

        {/* Grid Container */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Header Row - Teams */}
          <div className="grid grid-cols-6 bg-gray-50">
            <div className="p-4 font-medium text-center border-r border-gray-200">
              Time Slots
            </div>
            {teamIds.map(teamId => {
              const teamData = getTeamData(teamId);
              return (
                <div key={teamId} className="p-4 border-r border-gray-200 last:border-r-0">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="font-medium text-gray-900">{teamData.name}</div>
                      {canEdit && onTeamClick && (
                        <button
                          onClick={() => handleTeamHeaderClick(teamId)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Manage team members"
                        >
                          <Settings className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1">
                      {teamData.members.length > 0 ? (
                        teamData.members.map(member => (
                          <Badge 
                            key={member.id} 
                            variant={member.isActive ? "default" : "secondary"} 
                            className="text-xs"
                          >
                            {member.name}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          No members assigned
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Slot Rows */}
          {timeSlots.map((timeSlot, rowIndex) => (
            <div key={timeSlot} className={`grid grid-cols-6 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
              {/* Time Slot Label */}
              <div className="p-4 border-r border-t border-gray-200 bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="font-medium text-gray-900">{timeSlot}</div>
                  <div className="text-xs text-gray-500">2-hour slot</div>
                </div>
              </div>

              {/* Team Columns */}
              {teamIds.map(teamId => {
                const { requests, tasks, totalItems } = getItemsForSlot(teamId, timeSlot);
                const hasItems = totalItems > 0;
                const isOccupied = isSlotOccupied(teamId, timeSlot);

                return (
                  <div
                    key={`${teamId}-${timeSlot}`}
                    className={`min-h-[100px] p-3 border-r border-t border-gray-200 last:border-r-0 transition-all duration-200 ${
                      hasItems 
                        ? 'bg-white' 
                        : canEdit 
                          ? 'hover:bg-blue-25 cursor-pointer hover:ring-2 hover:ring-blue-200 hover:ring-inset' 
                          : 'bg-gray-25'
                    } ${isOccupied && canEdit ? 'ring-1 ring-blue-200 ring-inset' : ''}`}
                    onClick={() => canEdit && !hasItems && handleSlotClick(teamId, timeSlot)}
                    onDrop={(e) => handleDrop(e, teamId, timeSlot)}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                  >
                    <div className="space-y-2">
                      {/* Demo Requests */}
                      {requests.map(request => (
                        <div
                          key={request.id}
                          className={`p-2 rounded border text-xs ${getItemTypeColor(request.type)}`}
                        >
                          <div className="font-medium truncate">{request.clientName}</div>
                          <div className="flex items-center justify-between mt-1">
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
                      
                      {/* Tasks */}
                      {tasks.map(task => (
                        <div
                          key={task.id}
                          className={`p-2 rounded border text-xs ${getItemTypeColor(task.type)}`}
                        >
                          <div className="font-medium truncate">{task.title}</div>
                          <div className="flex items-center gap-1 text-xs opacity-75 mt-1">
                            <Clock className="size-3" />
                            {task.time}
                          </div>
                          {task.clientName && (
                            <div className="text-xs text-gray-600 truncate mt-1">
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

                      {/* Enhanced Drop Zone Visual Feedback */}
                      {!hasItems && canEdit && (
                        <div className="text-xs text-gray-400 text-center py-8 transition-all group-hover:text-blue-500">
                          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 transition-all hover:border-blue-300 hover:bg-blue-25">
                            Drop task here or click to add
                          </div>
                        </div>
                      )}
                      
                      {!hasItems && !canEdit && (
                        <div className="text-xs text-gray-300 text-center py-8">
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
        
        {/* Enhanced Info Banner */}
        {canEdit && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="size-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <div className="font-medium">Schedule Management</div>
                <div>
                  Each team can only have one task per time slot. Drag and drop tasks from the left panel or click on empty slots to add tasks.
                  Click the settings icon next to team names to manage team members.
                </div>
                <div className="mt-2 text-xs">
                  💡 <strong>Tip:</strong> When dragging tasks, move your mouse to the top or bottom edge of the screen to auto-scroll and access all time slots.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}