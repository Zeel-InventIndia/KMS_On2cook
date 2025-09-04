import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, Clock, User, Phone, Mail, FileText } from 'lucide-react';
import { DemoRequest, Task } from '../App';

interface RequestsListProps {
  requests: DemoRequest[];
  tasks: Task[];
  onDragEnd: (requestId: string, teamId: number, slot: string) => void;
  onTaskDragEnd: (taskId: string, teamId: number, slot: string) => void;
  canEdit: boolean;
}

export function RequestsList({ requests, tasks, onDragEnd, onTaskDragEnd, canEdit }: RequestsListProps) {
  const handleDragStart = (e: React.DragEvent, id: string, type: 'request' | 'task') => {
    if (!canEdit) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', JSON.stringify({ id, type }));
  };

  const getTypeColor = (type: string) => {
    const colors = {
      demo: 'bg-green-100 text-green-800',
      deployment: 'bg-blue-100 text-blue-800',
      recipe_development: 'bg-purple-100 text-purple-800',
      videoshoot: 'bg-orange-100 text-orange-800',
      event: 'bg-pink-100 text-pink-800',
      device_testing: 'bg-yellow-100 text-yellow-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-3">
      {/* Demo Requests from Google Sheets */}
      <div>
        <h4 className="font-medium text-sm text-gray-700 mb-2">Google Sheets Requests</h4>
        {requests.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No pending requests</p>
        ) : (
          requests.map(request => (
            <Card
              key={request.id}
              className={`mb-2 cursor-move transition-shadow ${
                canEdit ? 'hover:shadow-md' : 'opacity-75'
              }`}
              draggable={canEdit}
              onDragStart={(e) => handleDragStart(e, request.id, 'request')}
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm truncate">{request.clientName}</h5>
                    <Badge className={`text-xs ${getTypeColor(request.type)}`}>
                      {request.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  {request.specialTag && (
                    <Badge variant="secondary" className="text-xs">
                      {request.specialTag}
                    </Badge>
                  )}

                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {request.demoDate}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {request.demoTime}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="size-3" />
                      {request.salesRep}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="size-3" />
                      {request.clientMobile}
                    </div>
                  </div>

                  {request.recipes && request.recipes.length > 0 && (
                    <div className="text-xs">
                      <span className="text-gray-600">Recipes: </span>
                      <span className="font-medium">{request.recipes.join(', ')}</span>
                    </div>
                  )}

                  {request.notes && (
                    <div className="flex items-start gap-1 text-xs text-gray-600">
                      <FileText className="size-3 mt-0.5" />
                      <span>{request.notes}</span>
                    </div>
                  )}

                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      request.leadStatus === 'demo_planned' 
                        ? 'border-green-200 text-green-700' 
                        : 'border-orange-200 text-orange-700'
                    }`}
                  >
                    {request.leadStatus.replace('_', ' ')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Manual Tasks */}
      <div>
        <h4 className="font-medium text-sm text-gray-700 mb-2">Manual Tasks</h4>
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No pending tasks</p>
        ) : (
          tasks.map(task => (
            <Card
              key={task.id}
              className={`mb-2 cursor-move transition-shadow ${
                canEdit ? 'hover:shadow-md' : 'opacity-75'
              }`}
              draggable={canEdit}
              onDragStart={(e) => handleDragStart(e, task.id, 'task')}
            >
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-sm truncate">{task.title}</h5>
                    <Badge className={`text-xs ${getTypeColor(task.type)}`}>
                      {task.type.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {task.date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {task.time}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="size-3" />
                      Created by {task.createdBy}
                    </div>
                  </div>

                  {task.notes && (
                    <div className="flex items-start gap-1 text-xs text-gray-600">
                      <FileText className="size-3 mt-0.5" />
                      <span>{task.notes}</span>
                    </div>
                  )}

                  {task.clientName && (
                    <div className="text-xs">
                      <span className="text-gray-600">Client: </span>
                      <span className="font-medium">{task.clientName}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {canEdit && (requests.length > 0 || tasks.length > 0) && (
        <div className="text-xs text-gray-500 italic mt-4 p-2 bg-blue-50 rounded">
          💡 Drag and drop items to the schedule grid to assign them to teams
        </div>
      )}
    </div>
  );
}