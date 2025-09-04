import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LogOut, Clock, User, CheckCircle, Calendar, BookOpen } from 'lucide-react';
import { User as UserType, DemoRequest, Task } from '../App';
import { RecipeRepositoryV2 } from './RecipeRepositoryV2';
import { format, isToday, parseISO } from 'date-fns';

interface CulinaryTeamViewProps {
  user: UserType;
  demoRequests: DemoRequest[];
  tasks: Task[];
  onUpdateDemoRequest: (request: DemoRequest) => void;
  onUpdateTask: (task: Task) => void;
  onLogout: () => void;
}

export function CulinaryTeamView({
  user,
  demoRequests,
  tasks,
  onUpdateDemoRequest,
  onUpdateTask,
  onLogout
}: CulinaryTeamViewProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Get today's tasks for the user's team
  const todaysTasks = [
    ...demoRequests.filter(req => 
      req.assignedTeam === user.team && 
      req.demoDate === today &&
      (req.status === 'assigned' || req.status === 'in_progress')
    ),
    ...tasks.filter(task => 
      task.assignedTeam === user.team && 
      task.date === today &&
      (task.status === 'assigned' || task.status === 'in_progress')
    )
  ];

  // Get all assigned tasks for the user's team (upcoming and past)
  const allTeamTasks = [
    ...demoRequests.filter(req => req.assignedTeam === user.team),
    ...tasks.filter(task => task.assignedTeam === user.team)
  ].sort((a, b) => {
    const dateA = 'demoDate' in a ? a.demoDate : a.date;
    const dateB = 'demoDate' in b ? b.demoDate : b.date;
    const timeA = 'demoDate' in a ? a.demoTime : a.time;
    const timeB = 'demoDate' in b ? b.time : b.time;
    
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return timeA.localeCompare(timeB);
  });

  const handleMarkComplete = (item: DemoRequest | Task) => {
    if ('demoDate' in item) {
      // It's a DemoRequest
      const updatedRequest = {
        ...item,
        status: 'completed' as const,
        completedBy: user.name,
        completedAt: new Date().toISOString()
      };
      onUpdateDemoRequest(updatedRequest);
    } else {
      // It's a Task
      const updatedTask = {
        ...item,
        status: 'completed' as const
      };
      onUpdateTask(updatedTask);
    }
  };

  const handleMarkInProgress = (item: DemoRequest | Task) => {
    if ('demoDate' in item) {
      // It's a DemoRequest
      const updatedRequest = {
        ...item,
        status: 'in_progress' as const
      };
      onUpdateDemoRequest(updatedRequest);
    } else {
      // It's a Task
      const updatedTask = {
        ...item,
        status: 'in_progress' as const
      };
      onUpdateTask(updatedTask);
    }
  };

  const getItemTypeColor = (type: string) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Culinary Team Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Welcome, {user.name} - Team {user.team}
              </p>
            </div>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="size-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">My Tasks</TabsTrigger>
            <TabsTrigger value="recipes">Recipe Repository</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="size-5" />
                    Today's Tasks ({format(new Date(), 'MMM d, yyyy')})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {todaysTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No tasks scheduled for today</p>
                      <p className="text-sm mt-1">Enjoy your free time! 🎉</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todaysTasks.map((item, index) => {
                        const isRequest = 'demoDate' in item;
                        const type = isRequest ? item.type : item.type;
                        const time = isRequest ? item.demoTime : item.time;
                        const title = isRequest ? item.clientName : item.title;
                        const canUpdate = item.status !== 'completed';

                        return (
                          <div
                            key={`${isRequest ? 'req' : 'task'}-${item.id}`}
                            className="p-4 border rounded-lg bg-white"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-medium">{title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={getItemTypeColor(type)}>
                                    {type.replace('_', ' ')}
                                  </Badge>
                                  <Badge className={getStatusColor(item.status)}>
                                    {item.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Clock className="size-4" />
                                {time}
                              </div>
                            </div>

                            {isRequest && (
                              <div className="space-y-1 text-sm text-gray-600 mb-3">
                                {item.recipes.length > 0 && (
                                  <p><strong>Recipes:</strong> {item.recipes.join(', ')}</p>
                                )}
                                <p><strong>Sales Rep:</strong> {item.salesRep}</p>
                                <p><strong>Contact:</strong> {item.clientMobile}</p>
                                {item.specialTag && (
                                  <Badge variant="outline" className="text-xs">
                                    {item.specialTag}
                                  </Badge>
                                )}
                              </div>
                            )}

                            {!isRequest && item.notes && (
                              <p className="text-sm text-gray-600 mb-3">{item.notes}</p>
                            )}

                            {canUpdate && (
                              <div className="flex gap-2">
                                {item.status === 'assigned' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMarkInProgress(item)}
                                  >
                                    Start Task
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => handleMarkComplete(item)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="size-4 mr-2" />
                                  Mark Complete
                                </Button>
                              </div>
                            )}

                            {item.status === 'completed' && (
                              <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                                <CheckCircle className="size-4" />
                                <span>
                                  Completed {isRequest && item.completedBy && `by ${item.completedBy}`}
                                  {isRequest && item.completedAt && 
                                    ` at ${format(parseISO(item.completedAt), 'h:mm a')}`
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* All Team Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle>All Team {user.team} Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {allTeamTasks.length === 0 ? (
                      <p className="text-center py-8 text-gray-500">
                        No tasks assigned to your team yet
                      </p>
                    ) : (
                      allTeamTasks.map((item, index) => {
                        const isRequest = 'demoDate' in item;
                        const type = isRequest ? item.type : item.type;
                        const date = isRequest ? item.demoDate : item.date;
                        const time = isRequest ? item.demoTime : item.time;
                        const title = isRequest ? item.clientName : item.title;
                        const isPast = date < today;
                        const isTodayItem = date === today;

                        return (
                          <div
                            key={`${isRequest ? 'req' : 'task'}-${item.id}-all`}
                            className={`p-3 border rounded ${
                              isTodayItem 
                                ? 'bg-blue-50 border-blue-200' 
                                : isPast 
                                  ? 'bg-gray-50 opacity-75' 
                                  : 'bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="font-medium text-sm">{title}</h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge 
                                    className={getItemTypeColor(type)} 
                                    variant="outline"
                                  >
                                    {type.replace('_', ' ')}
                                  </Badge>
                                  <Badge 
                                    className={getStatusColor(item.status)}
                                    variant="outline"
                                  >
                                    {item.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right text-sm text-gray-600">
                                <div>{format(parseISO(date + 'T00:00:00'), 'MMM d')}</div>
                                <div>{time}</div>
                              </div>
                            </div>
                            
                            {isTodayItem && (
                              <Badge variant="secondary" className="text-xs mt-2">
                                Today's Task
                              </Badge>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recipes">
            <Card>
              <CardContent className="p-6">
                <RecipeRepositoryV2
                  user={user}
                  selectionMode={false}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}