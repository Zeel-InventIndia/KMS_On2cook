import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Calendar, Clock, Users, Plus, Settings, RefreshCw, AlertCircle, CheckCircle, XCircle, Calendar as CalendarIcon, User, Phone, Mail, Target, Database } from 'lucide-react';
import { User as UserType, DemoRequest, Task } from '../App';
import { RecipeRepositoryV2 } from './RecipeRepositoryV2';

interface BusinessUserDashboardProps {
  user: UserType;
  demoRequests: DemoRequest[];
  tasks: Task[];
  onCreateRequest: (request: DemoRequest) => void;
  onUpdateDemoRequest: (request: DemoRequest) => void;
  onLogout: () => void;
  dataSource: 'mock' | 'csv' | 'csv-client';
  lastSheetsUpdate?: string | null;
  csvError?: string | null;
}

export function BusinessUserDashboard({
  user,
  demoRequests,
  tasks,
  onCreateRequest,
  onUpdateDemoRequest,
  onLogout,
  dataSource,
  lastSheetsUpdate,
  csvError
}: BusinessUserDashboardProps) {
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [showRecipeRepository, setShowRecipeRepository] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DemoRequest | null>(null);
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);

  // Group requests by status for better organization
  const requestsByStatus = {
    demo_planned: demoRequests.filter(req => req.leadStatus === 'demo_planned'),
    demo_rescheduled: demoRequests.filter(req => req.leadStatus === 'demo_rescheduled'),
    demo_cancelled: demoRequests.filter(req => req.leadStatus === 'demo_cancelled'),
    demo_given: demoRequests.filter(req => req.leadStatus === 'demo_given'),
  };

  // Get upcoming demos for the current week
  const getUpcomingDemos = () => {
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return demoRequests.filter(req => {
      if (!req.demoDate || req.leadStatus === 'demo_cancelled') return false;
      const demoDate = new Date(req.demoDate);
      return demoDate >= today && demoDate <= weekFromNow;
    }).sort((a, b) => new Date(a.demoDate).getTime() - new Date(b.demoDate).getTime());
  };

  const upcomingDemos = getUpcomingDemos();

  const handleAddRecipesToRequest = (request: DemoRequest) => {
    setSelectedRequest(request);
    setSelectedRecipes(request.recipes);
    setShowRecipeRepository(true);
  };

  const handleRecipeSelect = (recipes: string[]) => {
    setSelectedRecipes(recipes);
  };

  const handleSaveRecipesToRequest = () => {
    if (selectedRequest) {
      const updatedRequest = {
        ...selectedRequest,
        recipes: selectedRecipes
      };
      onUpdateDemoRequest(updatedRequest);
      setShowRecipeRepository(false);
      setSelectedRequest(null);
      setSelectedRecipes([]);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'demo_planned':
        return 'default';
      case 'demo_rescheduled':
        return 'secondary';
      case 'demo_cancelled':
        return 'destructive';
      case 'demo_given':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'demo_planned':
        return <CalendarIcon className="h-4 w-4" />;
      case 'demo_rescheduled':
        return <Clock className="h-4 w-4" />;
      case 'demo_cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'demo_given':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const isPresalesUser = user.role === 'presales';
  const userCanAddRecipes = isPresalesUser;

  // Check if we have no data
  const hasNoData = demoRequests.length === 0 && tasks.length === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">
                {user.role === 'presales' ? 'Presales Dashboard' : 
                 user.role === 'sales' ? 'Sales Dashboard' : 'CEO Dashboard'}
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {user.name}
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

      <div className="container mx-auto px-4 py-6">
        {/* CSV Error Alert */}
        {csvError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Data Loading Error:</strong> {csvError}
              <br />
              <span className="text-sm">Unable to fetch data from Google Sheets. Please check your internet connection or contact support if the issue persists.</span>
            </AlertDescription>
          </Alert>
        )}

        {/* No Data State */}
        {hasNoData && !csvError && (
          <div className="text-center py-12">
            <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Demo Data Available</h2>
            <p className="text-muted-foreground mb-6">
              No demo requests found in the Google Sheets. The system automatically syncs data every 2 minutes.
            </p>
            <p className="text-sm text-muted-foreground">
              Data Source: Google Sheets (Auto-synced)
            </p>
          </div>
        )}

        {/* Show content only if we have data */}
        {!hasNoData && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Planned Demos</CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{requestsByStatus.demo_planned.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Ready for execution
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rescheduled</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{requestsByStatus.demo_rescheduled.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Need new dates
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{requestsByStatus.demo_given.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Demos completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Week</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{upcomingDemos.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Upcoming demos
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Demos Section */}
            {upcomingDemos.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Upcoming Demos This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingDemos.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="font-medium">{request.clientName}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(request.demoDate)} at {request.demoTime}
                            </span>
                          </div>
                          <Badge variant={getStatusBadgeVariant(request.leadStatus)} className="flex items-center gap-1">
                            {getStatusIcon(request.leadStatus)}
                            {request.leadStatus.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {request.recipes.length} recipes
                          </span>
                          {userCanAddRecipes && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleAddRecipesToRequest(request)}
                            >
                              Manage Recipes
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Demo Requests by Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Planned Demos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Planned Demos ({requestsByStatus.demo_planned.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {requestsByStatus.demo_planned.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No planned demos</p>
                    ) : (
                      requestsByStatus.demo_planned.map((request) => (
                        <div key={request.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{request.clientName}</h4>
                            <Badge variant="default">Planned</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {request.clientMobile}
                            </div>
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {request.clientEmail}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(request.demoDate)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {request.demoTime}
                            </div>
                          </div>
                          {isPresalesUser && request.assignee === user.name.toLowerCase() && (
                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-sm text-muted-foreground">
                                {request.recipes.length} recipes assigned
                              </span>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleAddRecipesToRequest(request)}
                              >
                                {request.recipes.length > 0 ? 'Update Recipes' : 'Add Recipes'}
                              </Button>
                            </div>
                          )}
                          {request.assignedTeam && (
                            <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                              Assigned to Team {request.assignedTeam}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Rescheduled Demos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Rescheduled Demos ({requestsByStatus.demo_rescheduled.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {requestsByStatus.demo_rescheduled.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No rescheduled demos</p>
                    ) : (
                      requestsByStatus.demo_rescheduled.map((request) => (
                        <div key={request.id} className="border rounded-lg p-4 space-y-2 bg-yellow-50">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{request.clientName}</h4>
                            <Badge variant="secondary">Rescheduled</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {request.clientMobile}
                            </div>
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {request.clientEmail}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(request.demoDate)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {request.demoTime}
                            </div>
                          </div>
                          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                            Demo rescheduled - kitchen team needs to update schedule
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Completed and Cancelled Demos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Completed Demos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Completed Demos ({requestsByStatus.demo_given.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {requestsByStatus.demo_given.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No completed demos</p>
                    ) : (
                      requestsByStatus.demo_given.map((request) => (
                        <div key={request.id} className="border rounded-lg p-4 space-y-2 bg-green-50">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{request.clientName}</h4>
                            <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(request.demoDate)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {request.demoTime}
                            </div>
                          </div>
                          <div className="text-xs text-green-600 bg-green-100 p-2 rounded">
                            Demo completed - available for Vijay's media processing
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Cancelled Demos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Cancelled Demos ({requestsByStatus.demo_cancelled.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {requestsByStatus.demo_cancelled.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No cancelled demos</p>
                    ) : (
                      requestsByStatus.demo_cancelled.map((request) => (
                        <div key={request.id} className="border rounded-lg p-4 space-y-2 bg-red-50">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{request.clientName}</h4>
                            <Badge variant="destructive">Cancelled</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(request.demoDate)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {request.demoTime}
                            </div>
                          </div>
                          <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                            Demo cancelled - removed from all schedules
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Recipe Repository Modal */}
      {showRecipeRepository && (
        <Dialog open={true} onOpenChange={() => setShowRecipeRepository(false)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Add Recipes to Demo - {selectedRequest?.clientName}
              </DialogTitle>
              <DialogDescription>
                Select recipes from the repository to assign to this demo. You can search and filter recipes to find the ones that best match your client's needs.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <RecipeRepositoryV2
                user={user}
                selectionMode={true}
                selectedRecipes={selectedRecipes}
                onRecipeSelect={handleRecipeSelect}
              />
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowRecipeRepository(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRecipesToRequest}>
                  Save Recipes ({selectedRecipes.length})
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}