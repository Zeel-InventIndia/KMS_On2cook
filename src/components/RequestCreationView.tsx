import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Plus, LogOut, Calendar, CheckCircle, Clock, BookOpen, X } from 'lucide-react';
import { User as UserType, DemoRequest } from '../App';
import { Recipe } from '../types/Recipe';
import { RecipeRepository } from './RecipeRepository';
import { ToastContainer, ToastProps } from './Toast';

interface RequestCreationViewProps {
  user: UserType;
  onCreateRequest: (request: DemoRequest) => void;
  onLogout: () => void;
}

export function RequestCreationView({
  user,
  onCreateRequest,
  onLogout
}: RequestCreationViewProps) {
  const [requestType, setRequestType] = useState<'demo' | 'deployment' | 'recipe_development'>('demo');
  const [formData, setFormData] = useState({
    clientName: '',
    clientMobile: '',
    clientEmail: '',
    demoDate: '',
    demoTime: '',
    demoMode: 'onsite' as 'onsite' | 'virtual',
    recipes: '',
    specialTag: '' as 'QSR' | 'Cloud kitchen' | 'business' | '',
    notes: '',
    recipeName: '',
    remarks: ''
  });
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([]);

  const addToast = (toast: Omit<ToastProps, 'id'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const resetForm = () => {
    setFormData({
      clientName: '',
      clientMobile: '',
      clientEmail: '',
      demoDate: '',
      demoTime: '',
      demoMode: 'onsite',
      recipes: '',
      specialTag: '',
      notes: '',
      recipeName: '',
      remarks: ''
    });
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (requestType === 'recipe_development') {
      if (!formData.recipeName) {
        addToast({
          type: 'error',
          title: 'Validation Error',
          message: 'Recipe name is required for recipe development requests.'
        });
        return;
      }
    } else {
      if (!formData.clientName || !formData.demoDate || !formData.demoTime) {
        addToast({
          type: 'error',
          title: 'Validation Error',
          message: 'Client name, date, and time are required.'
        });
        return;
      }
    }

    const newRequest: DemoRequest = {
      id: `req-${Date.now()}`,
      clientName: requestType === 'recipe_development' ? formData.recipeName : formData.clientName,
      clientMobile: formData.clientMobile,
      clientEmail: formData.clientEmail,
      demoDate: formData.demoDate,
      demoTime: formData.demoTime,
      recipes: formData.recipes ? formData.recipes.split(',').map(r => r.trim()) : [],
      salesRep: user.name,
      leadStatus: 'demo_planned',
      specialTag: formData.specialTag || undefined,
      type: requestType,
      notes: requestType === 'recipe_development' ? formData.remarks : formData.notes,
      status: 'pending'
    };

    // Add demo mode for demo and deployment requests
    if (requestType === 'demo' || requestType === 'deployment') {
      (newRequest as any).demoMode = formData.demoMode;
    }

    onCreateRequest(newRequest);
    
    addToast({
      type: 'success',
      title: 'Request Submitted',
      message: `Your ${requestType.replace('_', ' ')} request has been submitted successfully.`
    });

    resetForm();
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'demo': return 'Demo Request';
      case 'deployment': return 'Deployment Request';
      case 'recipe_development': return 'Recipe Development';
      default: return type;
    }
  };

  const getTeamLabel = (role: string) => {
    switch (role) {
      case 'presales': return 'Presales Team';
      case 'sales': return 'Sales Team';
      case 'ceo': return 'CEO';
      default: return role;
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
                On2Cook Kitchen Management
              </h1>
              <p className="text-sm text-gray-600">
                Welcome, {user.name} ({getTeamLabel(user.role)})
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">Request Portal</Badge>
              <Button variant="outline" onClick={onLogout}>
                <LogOut className="size-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!showForm ? (
          /* Request Type Selection */
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Create New Request
              </h2>
              <p className="text-gray-600">
                Choose the type of request you'd like to submit to the kitchen team
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Demo Request Card */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-200">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="size-6 text-green-600" />
                  </div>
                  <CardTitle className="text-lg">Demo Request</CardTitle>
                </CardHeader>
                <CardContent className="text-center pb-6">
                  <p className="text-gray-600 mb-4">
                    Request an onsite or virtual product demonstration for your client
                  </p>
                  <ul className="text-sm text-gray-500 space-y-1 mb-6">
                    <li>• Client details required</li>
                    <li>• Choose onsite or virtual</li>
                    <li>• Schedule date and time</li>
                    <li>• Specify recipes to demo</li>
                  </ul>
                  <Button 
                    onClick={() => {
                      setRequestType('demo');
                      setShowForm(true);
                    }}
                    className="w-full"
                  >
                    <Plus className="size-4 mr-2" />
                    Create Demo Request
                  </Button>
                </CardContent>
              </Card>

              {/* Deployment Request Card */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-200">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="size-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">Deployment Request</CardTitle>
                </CardHeader>
                <CardContent className="text-center pb-6">
                  <p className="text-gray-600 mb-4">
                    Request equipment deployment and setup at client location
                  </p>
                  <ul className="text-sm text-gray-500 space-y-1 mb-6">
                    <li>• Client location details</li>
                    <li>• Equipment specifications</li>
                    <li>• Installation timeline</li>
                    <li>• Setup requirements</li>
                  </ul>
                  <Button 
                    onClick={() => {
                      setRequestType('deployment');
                      setShowForm(true);
                    }}
                    className="w-full"
                  >
                    <Plus className="size-4 mr-2" />
                    Create Deployment Request
                  </Button>
                </CardContent>
              </Card>

              {/* Recipe Development Card */}
              <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-200">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <Clock className="size-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">Recipe Development</CardTitle>
                </CardHeader>
                <CardContent className="text-center pb-6">
                  <p className="text-gray-600 mb-4">
                    Request development of custom recipes or menu items
                  </p>
                  <ul className="text-sm text-gray-500 space-y-1 mb-6">
                    <li>• Recipe name and concept</li>
                    <li>• Special requirements</li>
                    <li>• Target cuisine type</li>
                    <li>• Development timeline</li>
                  </ul>
                  <Button 
                    onClick={() => {
                      setRequestType('recipe_development');
                      setShowForm(true);
                    }}
                    className="w-full"
                  >
                    <Plus className="size-4 mr-2" />
                    Create Recipe Request
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Request Form */
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  {getRequestTypeLabel(requestType)}
                </CardTitle>
                <Button variant="outline" onClick={resetForm}>
                  Back to Selection
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {requestType === 'recipe_development' ? (
                  /* Recipe Development Form */
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="recipeName">Recipe Name *</Label>
                      <Input
                        id="recipeName"
                        value={formData.recipeName}
                        onChange={(e) => setFormData(prev => ({ ...prev, recipeName: e.target.value }))}
                        placeholder="e.g., Fusion Butter Chicken Pizza"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="remarks">Requirements & Remarks *</Label>
                      <Textarea
                        id="remarks"
                        value={formData.remarks}
                        onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                        placeholder="Describe the recipe requirements, target audience, special ingredients, cooking method preferences, etc."
                        rows={4}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="demoDate">Target Completion Date</Label>
                        <Input
                          id="demoDate"
                          type="date"
                          value={formData.demoDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, demoDate: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="specialTag">Recipe Category</Label>
                        <Select value={formData.specialTag} onValueChange={(value: any) => setFormData(prev => ({ ...prev, specialTag: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="QSR">Quick Service Restaurant</SelectItem>
                            <SelectItem value="Cloud kitchen">Cloud Kitchen</SelectItem>
                            <SelectItem value="business">Fine Dining/Business</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Demo/Deployment Form */
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientName">Client Name *</Label>
                        <Input
                          id="clientName"
                          value={formData.clientName}
                          onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                          placeholder="Client or company name"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clientMobile">Client Mobile</Label>
                        <Input
                          id="clientMobile"
                          value={formData.clientMobile}
                          onChange={(e) => setFormData(prev => ({ ...prev, clientMobile: e.target.value }))}
                          placeholder="+91 98765 43210"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientEmail">Client Email</Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        value={formData.clientEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                        placeholder="client@example.com"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="demoDate">{requestType === 'demo' ? 'Demo Date' : 'Deployment Date'} *</Label>
                        <Input
                          id="demoDate"
                          type="date"
                          value={formData.demoDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, demoDate: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="demoTime">{requestType === 'demo' ? 'Demo Time' : 'Deployment Time'} *</Label>
                        <Select value={formData.demoTime} onValueChange={(value) => setFormData(prev => ({ ...prev, demoTime: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="09:00">09:00 AM</SelectItem>
                            <SelectItem value="11:00">11:00 AM</SelectItem>
                            <SelectItem value="13:00">01:00 PM</SelectItem>
                            <SelectItem value="15:00">03:00 PM</SelectItem>
                            <SelectItem value="17:00">05:00 PM</SelectItem>
                            <SelectItem value="19:00">07:00 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {requestType === 'demo' && (
                      <div className="space-y-3">
                        <Label>Demo Mode *</Label>
                        <RadioGroup 
                          value={formData.demoMode} 
                          onValueChange={(value: 'onsite' | 'virtual') => setFormData(prev => ({ ...prev, demoMode: value }))}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="onsite" id="onsite" />
                            <Label htmlFor="onsite">Onsite Demo</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="virtual" id="virtual" />
                            <Label htmlFor="virtual">Virtual Demo</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="recipes">{requestType === 'demo' ? 'Recipes to Demo' : 'Equipment/Items'}</Label>
                        {requestType === 'demo' && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowRecipeSelector(true)}
                          >
                            <BookOpen className="size-4 mr-2" />
                            Browse Recipes
                          </Button>
                        )}
                      </div>
                      
                      {/* Selected Recipes Display */}
                      {selectedRecipes.length > 0 && requestType === 'demo' && (
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Selected Recipes:</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedRecipes.map(recipe => (
                              <Badge 
                                key={recipe.id} 
                                variant="secondary" 
                                className="flex items-center gap-1"
                              >
                                {recipe.name}
                                <X 
                                  className="size-3 cursor-pointer hover:text-destructive" 
                                  onClick={() => {
                                    setSelectedRecipes(prev => prev.filter(r => r.id !== recipe.id));
                                    setFormData(prev => ({
                                      ...prev,
                                      recipes: selectedRecipes
                                        .filter(r => r.id !== recipe.id)
                                        .map(r => r.name)
                                        .join(', ')
                                    }));
                                  }}
                                />
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <Input
                        id="recipes"
                        value={formData.recipes}
                        onChange={(e) => setFormData(prev => ({ ...prev, recipes: e.target.value }))}
                        placeholder={requestType === 'demo' ? "Type recipe names or use Browse Recipes button above" : "Oven Model X, Mixer Y, etc."}
                      />
                      <p className="text-sm text-gray-500">
                        {requestType === 'demo' 
                          ? "Separate multiple items with commas or select from our recipe repository"
                          : "Separate multiple items with commas"
                        }
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specialTag">Business Category</Label>
                      <Select value={formData.specialTag} onValueChange={(value: any) => setFormData(prev => ({ ...prev, specialTag: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="QSR">Quick Service Restaurant</SelectItem>
                          <SelectItem value="Cloud kitchen">Cloud Kitchen</SelectItem>
                          <SelectItem value="business">Fine Dining/Business</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any special requirements, preferences, or additional information"
                        rows={3}
                      />
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Submit {getRequestTypeLabel(requestType)}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <RecipeRepository
                user={user}
                selectionMode={true}
                onSelectRecipe={(recipe) => {
                  if (!selectedRecipes.find(r => r.id === recipe.id)) {
                    const newSelectedRecipes = [...selectedRecipes, recipe];
                    setSelectedRecipes(newSelectedRecipes);
                    setFormData(prev => ({
                      ...prev,
                      recipes: newSelectedRecipes.map(r => r.name).join(', ')
                    }));
                  }
                }}
                onClose={() => setShowRecipeSelector(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}