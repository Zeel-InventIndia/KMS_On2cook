import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Search,
  Eye,
  Filter,
  AlertCircle,
  BookOpen,
  CheckCircle,
  User as UserIcon,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { User, DemoRequest, Task, TEAM_GROUPS, TIME_SLOTS, Recipe, formatDateSafely } from '../App';
import { RecipeRepositoryV2 } from './RecipeRepositoryV2';
import { DemoDetailModal } from './DemoDetailModal';
import { getScheduleViewDemoRequests } from '../utils/helpers';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface NewPresalesDashboardProps {
  user: User;
  demoRequests: DemoRequest[];
  allDemoRequests: DemoRequest[];
  tasks: Task[];
  onUpdateDemoRequest: (request: DemoRequest) => void;
  onLogout: () => void;
  dataSource: 'csv' | 'csv-client';
  lastSheetsUpdate?: string | null;
  csvError?: string | null;
}

interface RecipeSelectionModalProps {
  demo: DemoRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (demo: DemoRequest) => void;
}

function RecipeSelectionModal({ demo, isOpen, onClose, onUpdate }: RecipeSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);
  const [availableRecipes, setAvailableRecipes] = useState<string[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);
  const [recipeError, setRecipeError] = useState<string | null>(null);

  // API helper function
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-3005c377${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  };

  // Fetch recipes from backend
  const fetchRecipes = async () => {
    try {
      setIsLoadingRecipes(true);
      setRecipeError(null);
      const result = await apiCall('/recipes');
      
      // Extract recipe names from the backend response
      const recipeNames = (result.data || []).map((recipe: Recipe) => recipe.name);
      setAvailableRecipes(recipeNames);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setRecipeError(error instanceof Error ? error.message : 'Failed to fetch recipes');
      
      // Fallback to a basic set of recipes if backend fails
      setAvailableRecipes([
        'Paneer Tikka', 'Dal Makhani', 'Butter Chicken', 'Biryani', 'Naan', 'Samosa',
        'Chole Bhature', 'Rajma', 'Aloo Gobi', 'Palak Paneer', 'Chicken Curry',
        'Fish Curry', 'Mutton Biryani', 'Tandoori Chicken', 'Kebabs', 'Dosa',
        'Idli', 'Upma', 'Poha', 'Paratha', 'Roti', 'Rice', 'Pulao'
      ]);
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  // Fetch recipes when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchRecipes();
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (demo) {
      setSelectedRecipes(demo.recipes);
    }
  }, [demo]);

  const filteredRecipes = availableRecipes.filter(recipe =>
    recipe.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRecipeToggle = (recipe: string) => {
    setSelectedRecipes(prev =>
      prev.includes(recipe)
        ? prev.filter(r => r !== recipe)
        : [...prev, recipe]
    );
  };

  const handleSave = () => {
    if (demo) {
      onUpdate({
        ...demo,
        recipes: selectedRecipes
      });
    }
    onClose();
  };

  const handleRetryFetch = () => {
    fetchRecipes();
  };

  if (!demo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Recipes - {demo.clientName}</DialogTitle>
          <DialogDescription>
            Search and select recipes for this demo
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Recipe Loading/Error State */}
          {recipeError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Backend Error: {recipeError}</span>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleRetryFetch}
                  disabled={isLoadingRecipes}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingRecipes ? 'animate-spin' : ''}`} />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={isLoadingRecipes}
            />
          </div>

          <div className="max-h-60 overflow-auto border rounded-lg p-2">
            {isLoadingRecipes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-muted-foreground">Loading recipes from repository...</span>
              </div>
            ) : filteredRecipes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No recipes found matching your search.' : 'No recipes available in repository.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredRecipes.map((recipe) => (
                  <div
                    key={recipe}
                    onClick={() => handleRecipeToggle(recipe)}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      selectedRecipes.includes(recipe)
                        ? 'bg-blue-100 border-blue-300 border'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{recipe}</span>
                      {selectedRecipes.includes(recipe) && (
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-medium mb-2">Selected Recipes ({selectedRecipes.length})</h4>
            <div className="flex flex-wrap gap-2">
              {selectedRecipes.map((recipe) => (
                <Badge key={recipe} variant="default" className="cursor-pointer" onClick={() => handleRecipeToggle(recipe)}>
                  {recipe} ×
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={isLoadingRecipes}>
              Save Recipes ({selectedRecipes.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NewPresalesDashboard({
  user,
  demoRequests,
  allDemoRequests,
  tasks,
  onUpdateDemoRequest,
  onLogout,
  dataSource,
  lastSheetsUpdate,
  csvError
}: NewPresalesDashboardProps) {
  const [selectedDemo, setSelectedDemo] = useState<DemoRequest | null>(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showDemoDetail, setShowDemoDetail] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState<string>('all');

  // Filter kitchen schedule based on selected filter - include demo_given
  const getFilteredSchedule = () => {
    const baseSchedule = getScheduleViewDemoRequests(allDemoRequests);
    
    switch (scheduleFilter) {
      case 'my_demos':
        return baseSchedule.filter(req => 
          req.assignee === user.name.toLowerCase() && req.assignedTeam
        );
      case 'assigned':
        return baseSchedule.filter(req => req.assignedTeam);
      case 'pending':
        return baseSchedule.filter(req => !req.assignedTeam && req.recipes.length > 0);
      case 'demo_given':
        return baseSchedule.filter(req => req.leadStatus === 'demo_given');
      default:
        return baseSchedule;
    }
  };

  const filteredSchedule = getFilteredSchedule();

  const handleAddRecipes = (demo: DemoRequest) => {
    setSelectedDemo(demo);
    setShowRecipeModal(true);
  };

  const handleViewDemo = (demo: DemoRequest) => {
    setSelectedDemo(demo);
    setShowDemoDetail(true);
  };

  const formatDate = (dateString: string) => {
    return formatDateSafely(dateString, dateString);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'demo_planned': return 'bg-green-100 text-green-800 border-green-200';
      case 'demo_rescheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'demo_cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'demo_given': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Helper function to get assigned demo for a specific team and time slot
  const getAssignedDemo = (teamId: number, timeSlot: string) => {
    return filteredSchedule.find(req => req.assignedTeam === teamId && req.assignedSlot === timeSlot);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Presales Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, {user.name} • Demo Planning & Recipe Management
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

      {/* CSV Error Alert */}
      {csvError && (
        <div className="container mx-auto px-4 pt-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Data Loading Error:</strong> {csvError}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content - Two Horizontal Halves */}
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6 h-[calc(100vh-200px)]">
          
          {/* Top Half - My Demo Requests */}
          <div className="h-1/2">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  My Demo Requests ({demoRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <div className="space-y-3">
                  {demoRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No demo requests assigned to you</p>
                      <p className="text-sm">Check the Google Sheets for new assignments</p>
                    </div>
                  ) : (
                    demoRequests.map((demo) => (
                      <div key={demo.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="font-medium">{demo.clientName}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(demo.demoDate)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {demo.demoTime}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(demo.leadStatus)}>
                              {demo.leadStatus === 'demo_given' ? 'Demo Given ✓' : demo.leadStatus.replace('_', ' ')}
                            </Badge>
                            {demo.assignedTeam && (
                              <Badge variant="outline">
                                Team {demo.assignedTeam}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              <strong>Recipes ({demo.recipes.length}):</strong>
                            </span>
                            {demo.leadStatus !== 'demo_given' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddRecipes(demo)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {demo.recipes.length > 0 ? 'Manage' : 'Add'} Recipes
                              </Button>
                            )}
                            {demo.leadStatus === 'demo_given' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDemo(demo)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Details
                              </Button>
                            )}
                          </div>
                          {demo.recipes.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {demo.recipes.slice(0, 3).map((recipe, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {recipe}
                                </Badge>
                              ))}
                              {demo.recipes.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{demo.recipes.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {demo.notes && (
                          <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                            <strong>Notes:</strong> {demo.notes}
                          </div>
                        )}

                        {demo.assignedTeam && (
                          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                            <strong>Status:</strong> Assigned to kitchen team for execution
                          </div>
                        )}

                        {demo.leadStatus === 'demo_given' && demo.mediaLink && (
                          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            <strong>Media:</strong> 
                            <Button
                              size="sm"
                              variant="link"
                              className="h-auto p-0 ml-1"
                              onClick={() => window.open(demo.mediaLink, '_blank')}
                            >
                              View Demo Media
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Half - Kitchen Schedule and Recipe Repository */}
          <div className="h-1/2">
            <Tabs defaultValue="schedule" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="schedule">Kitchen Schedule</TabsTrigger>
                <TabsTrigger value="recipes">Recipe Repository</TabsTrigger>
              </TabsList>

              {/* Kitchen Schedule Tab - Tabular Format */}
              <TabsContent value="schedule" className="flex-1 mt-4">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Kitchen Schedule (Time vs Teams)
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <select
                          value={scheduleFilter}
                          onChange={(e) => setScheduleFilter(e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="all">All Demos</option>
                          <option value="my_demos">My Assigned Demos</option>
                          <option value="assigned">All Assigned</option>
                          <option value="pending">Pending Assignment</option>
                          <option value="demo_given">Completed Demos</option>
                        </select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium text-sm">Time Slot</th>
                            {TEAM_GROUPS.map((team) => (
                              <th key={team.id} className="text-center p-3 font-medium text-sm border-l">
                                <div>{team.name}</div>
                                <div className="text-xs text-muted-foreground font-normal">
                                  {team.members.join(', ')}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {TIME_SLOTS.map((timeSlot, timeIndex) => (
                            <tr key={timeSlot} className={timeIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                              <td className="p-3 font-medium text-sm border-r">
                                {timeSlot}
                              </td>
                              {TEAM_GROUPS.map((team) => {
                                const assignedDemo = getAssignedDemo(team.id, timeSlot);
                                
                                return (
                                  <td key={team.id} className="p-3 border-l min-h-[80px] align-top">
                                    {assignedDemo ? (
                                      <div className={`${
                                        assignedDemo.leadStatus === 'demo_given' 
                                          ? 'bg-blue-50 border border-blue-200' 
                                          : 'bg-green-50 border border-green-200'
                                      } rounded p-3 min-h-[60px] space-y-2 cursor-pointer hover:shadow-md transition-shadow`}
                                        onClick={() => handleViewDemo(assignedDemo)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className={`font-medium text-sm ${
                                            assignedDemo.leadStatus === 'demo_given'
                                              ? 'text-blue-900'
                                              : 'text-green-900'
                                          }`}>
                                            {assignedDemo.clientName}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            {assignedDemo.assignee === user.name.toLowerCase() && (
                                              <Badge variant="outline" className="text-xs">
                                                Mine
                                              </Badge>
                                            )}
                                            <Eye className="h-3 w-3 text-muted-foreground" />
                                          </div>
                                        </div>
                                        <div className={`text-xs ${
                                          assignedDemo.leadStatus === 'demo_given'
                                            ? 'text-blue-700'
                                            : 'text-green-700'
                                        }`}>
                                          {assignedDemo.recipes.slice(0, 2).join(', ')}
                                          {assignedDemo.recipes.length > 2 && '...'}
                                        </div>
                                        <div className={`text-xs ${
                                          assignedDemo.leadStatus === 'demo_given'
                                            ? 'text-blue-600'
                                            : 'text-green-600'
                                        }`}>
                                          {formatDate(assignedDemo.demoDate)} • {assignedDemo.demoTime}
                                        </div>
                                        {assignedDemo.leadStatus === 'demo_given' && (
                                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                            Demo Given ✓
                                          </Badge>
                                        )}
                                        {(assignedDemo.leadStatus === 'demo_rescheduled' || 
                                          assignedDemo.leadStatus === 'demo_cancelled') && (
                                          <Badge variant="destructive" className="text-xs">
                                            {assignedDemo.leadStatus.replace('_', ' ')}
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="bg-gray-50 border border-dashed border-gray-300 rounded p-3 min-h-[60px] flex items-center justify-center text-xs text-muted-foreground">
                                        Available
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Recipe Repository Tab */}
              <TabsContent value="recipes" className="flex-1 mt-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Recipe Repository
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-full">
                    <RecipeRepositoryV2 user={user} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Recipe Selection Modal */}
      <RecipeSelectionModal
        demo={selectedDemo}
        isOpen={showRecipeModal}
        onClose={() => setShowRecipeModal(false)}
        onUpdate={onUpdateDemoRequest}
      />

      {/* Demo Detail Modal */}
      <DemoDetailModal
        demo={selectedDemo}
        isOpen={showDemoDetail}
        onClose={() => setShowDemoDetail(false)}
        onUpdate={onUpdateDemoRequest}
        readOnly={false}
        showMediaSection={true}
      />
    </div>
  );
}