import { Task, TaskType, TaskStatus, Team, DemoMode } from '../../types/Task';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MapPin, Video, Clock, User, Phone, Mail, ChefHat, Camera, Cog, Calendar } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface TaskCardProps {
  task: Task;
  team?: Team;
  onTaskUpdate: (task: Task) => void;
  isDraggable?: boolean;
}

export function TaskCard({ task, team, onTaskUpdate, isDraggable = false }: TaskCardProps) {
  const getTaskIcon = () => {
    switch (task.type) {
      case TaskType.DEMO:
        return task.demoMode === DemoMode.VIRTUAL ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />;
      case TaskType.DEPLOYMENT:
        return <Cog className="w-4 h-4" />;
      case TaskType.RECIPE_DEVELOPMENT:
        return <ChefHat className="w-4 h-4" />;
      case TaskType.VIDEOSHOOT:
        return <Camera className="w-4 h-4" />;
      case TaskType.EVENT:
        return <Calendar className="w-4 h-4" />;
      case TaskType.DEVICE_TESTING:
        return <Cog className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    switch (task.status) {
      case TaskStatus.PLANNED:
        return 'bg-blue-100 text-blue-800';
      case TaskStatus.ASSIGNED:
        return 'bg-yellow-100 text-yellow-800';
      case TaskStatus.IN_PROGRESS:
        return 'bg-orange-100 text-orange-800';
      case TaskStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case TaskStatus.RESCHEDULED:
        return 'bg-purple-100 text-purple-800';
      case TaskStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isDemo = task.type === TaskType.DEMO || task.type === TaskType.DEPLOYMENT;

  const handleStatusChange = (newStatus: TaskStatus) => {
    onTaskUpdate({ ...task, status: newStatus, updatedAt: new Date().toISOString() });
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;
    e.dataTransfer.setData('text/plain', task.id);
  };

  return (
    <Card
      className={`p-3 mb-2 cursor-move hover:shadow-md transition-shadow ${
        isDemo ? 'border-l-4 border-l-green-500' : ''
      }`}
      draggable={isDraggable}
      onDragStart={handleDragStart}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getTaskIcon()}
            <span className="font-medium text-sm">{task.title}</span>
          </div>
          <Badge variant="secondary" className={getStatusColor()}>
            {task.status}
          </Badge>
        </div>

        {task.clientName && (
          <div className="text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3" />
              <span>{task.clientName}</span>
              {task.leadTag && (
                <Badge variant="outline" className="text-xs">
                  {task.leadTag}
                </Badge>
              )}
            </div>
          </div>
        )}

        {task.salesRep && (
          <div className="text-xs text-gray-600">
            Sales Rep: {task.salesRep}
          </div>
        )}

        {task.recipes && task.recipes.length > 0 && (
          <div className="text-xs text-gray-600">
            Recipes: {task.recipes.slice(0, 2).join(', ')}
            {task.recipes.length > 2 && ` +${task.recipes.length - 2} more`}
          </div>
        )}

        {team && (
          <div className="text-xs text-gray-600">
            Team: {team.name}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {task.duration}h duration
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                ⋯
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {task.status === TaskStatus.ASSIGNED && (
                <DropdownMenuItem onClick={() => handleStatusChange(TaskStatus.IN_PROGRESS)}>
                  Start Task
                </DropdownMenuItem>
              )}
              {task.status === TaskStatus.IN_PROGRESS && (
                <DropdownMenuItem onClick={() => handleStatusChange(TaskStatus.COMPLETED)}>
                  Mark Complete
                </DropdownMenuItem>
              )}
              {[TaskStatus.PLANNED, TaskStatus.ASSIGNED].includes(task.status) && (
                <DropdownMenuItem onClick={() => handleStatusChange(TaskStatus.RESCHEDULED)}>
                  Reschedule
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleStatusChange(TaskStatus.CANCELLED)}>
                Cancel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}