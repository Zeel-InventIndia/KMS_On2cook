import React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Calendar, Clock, Users, Eye, ChefHat } from 'lucide-react';
import { DemoRequest, formatDateSafely } from '../App';

interface DemoCardProps {
  demo: DemoRequest;
  onViewDemo: (demo: DemoRequest) => void;
  showTeamMember?: boolean;
  isInSchedule?: boolean;
}

export function DemoCard({ demo, onViewDemo, showTeamMember = false, isInSchedule = false }: DemoCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'demo_planned': return 'bg-green-100 text-green-800 border-green-200';
      case 'demo_rescheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'demo_cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'demo_given': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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

  const formatDate = (dateString: string) => {
    return formatDateSafely(dateString, dateString);
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <h4 className="font-medium">{demo.clientName}</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(demo.demoDate)}
            </div>
            {demo.demoTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {demo.demoTime}
              </div>
            )}
            {showTeamMember && demo.assignedMember && (
              <div className="flex items-center gap-1">
                <ChefHat className="h-3 w-3" />
                <span className="font-medium text-blue-700">
                  {demo.assignedMember}
                </span>
              </div>
            )}
            {demo.recipes && demo.recipes.length > 0 && (
              <div className="text-xs">
                Recipes: {demo.recipes.join(', ')}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className={getStatusColor(demo.leadStatus)}>
            {getStatusDisplayLabel(demo)}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewDemo(demo)}
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
        </div>
      </div>
    </div>
  );
}