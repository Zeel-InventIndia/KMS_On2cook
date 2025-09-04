import React from 'react';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Clock, User, Mail, Phone, Calendar, GripVertical } from 'lucide-react';
import { DemoRequest, Task } from '../App';
import { useDragAutoScroll } from '../utils/useDragAutoScroll';

interface HorizontalRequestsListProps {
  requests: DemoRequest[];
  tasks: Task[];
  onDragEnd: (requestId: string, teamId: number, slot: string) => void;
  onTaskDragEnd: (taskId: string, teamId: number, slot: string) => void;
  canEdit: boolean;
}

export function HorizontalRequestsList({
  requests,
  tasks,
  onDragEnd,
  onTaskDragEnd,
  canEdit
}: HorizontalRequestsListProps) {
  const { startDragging, stopDragging } = useDragAutoScroll({
    scrollThreshold: 50,
    scrollSpeed: 15,
    enabled: canEdit
  });

  const handleDragStart = (e: React.DragEvent, item: DemoRequest | Task, type: 'request' | 'task') => {
    if (!canEdit) return;
    
    e.dataTransfer.setData('text/plain', JSON.stringify({
      id: item.id,
      type: type
    }));

    // Start auto-scroll functionality
    startDragging();
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Stop auto-scroll functionality
    stopDragging();
  };

  const getTypeColor = (type: string) => {
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const allItems = [
    ...requests.map(r => ({ ...r, itemType: 'request' as const })),
    ...tasks.map(t => ({ ...t, itemType: 'task' as const }))
  ];

  if (allItems.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
        <div className="text-gray-500">
          <Calendar className="size-8 mx-auto mb-2 opacity-50" />
          <div className="font-medium">No pending requests or tasks</div>
          <div className="text-sm">All items have been scheduled</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Pending Requests & Tasks</h3>
        <div className="text-sm text-gray-500">
          {allItems.length} item{allItems.length !== 1 ? 's' : ''} to schedule
        </div>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
        {allItems.map((item) => (
          <Card
            key={`${item.itemType}-${item.id}`}
            className={`min-w-[280px] max-w-[280px] border transition-all ${
              canEdit ? 'cursor-grab hover:shadow-md hover:scale-105' : 'cursor-default'
            }`}
            draggable={canEdit}
            onDragStart={(e) => handleDragStart(e, item, item.itemType)}
            onDragEnd={handleDragEnd}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {canEdit && <GripVertical className="size-4 text-gray-400 flex-shrink-0" />}
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getTypeColor(item.type)}`}
                      >
                        {item.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-gray-900 truncate">
                      {item.itemType === 'request' 
                        ? (item as DemoRequest).clientName 
                        : (item as Task).title
                      }
                    </h4>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  {item.itemType === 'request' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="size-4" />
                        <span>{formatDate((item as DemoRequest).demoDate)} at {(item as DemoRequest).demoTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="size-4" />
                        <span>Sales: {(item as DemoRequest).salesRep}</span>
                      </div>
                      {(item as DemoRequest).specialTag && (
                        <Badge variant="outline" className="text-xs">
                          {(item as DemoRequest).specialTag}
                        </Badge>
                      )}
                      {(item as DemoRequest).recipes.length > 0 && (
                        <div className="text-xs text-gray-500">
                          Recipes: {(item as DemoRequest).recipes.slice(0, 2).join(', ')}
                          {(item as DemoRequest).recipes.length > 2 && '...'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="size-4" />
                        <span>{formatDate((item as Task).date)} at {(item as Task).time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="size-4" />
                        <span>Created by: {(item as Task).createdBy}</span>
                      </div>
                      {(item as Task).clientName && (
                        <div className="text-xs text-gray-500">
                          Client: {(item as Task).clientName}
                        </div>
                      )}
                      {(item as Task).notes && (
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {(item as Task).notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Drag Hint */}
                {canEdit && (
                  <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
                    Drag to schedule
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Auto-scroll hint for users */}
      {canEdit && allItems.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          💡 When dragging, move your mouse to the top or bottom edge of the screen to auto-scroll
        </div>
      )}
    </div>
  );
}