import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  Search, 
  Plus, 
  Image, 
  FileText, 
  ChefHat,
  RefreshCw,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import { User as UserType } from '../App';

// Backend recipe interface (simplified from the full Recipe type)
interface BackendRecipe {
  id?: string;
  name?: string;
  imageLink?: string;
  jsonLink?: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { RecipeImageWithFallback } from './RecipeImageWithFallback';

interface BackendRecipeSelectorProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipes: (recipes: string[]) => void;
  selectedRecipes?: string[];
}

export function BackendRecipeSelector({ 
  user, 
  isOpen, 
  onClose, 
  onSelectRecipes,
  selectedRecipes = [] 
}: BackendRecipeSelectorProps) {
  const [recipes, setRecipes] = useState<BackendRecipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<BackendRecipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSelection, setLocalSelection] = useState<string[]>(selectedRecipes);

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
      setIsLoading(true);
      setError(null);
      console.log('🔄 Fetching recipes from backend...');
      
      const result = await apiCall('/recipes');
      const backendRecipes = Array.isArray(result.data) ? result.data : [];
      
      // Filter out any null/undefined recipes from the backend
      const validRecipes = backendRecipes.filter(recipe => 
        recipe && 
        typeof recipe === 'object' &&
        recipe.name && 
        typeof recipe.name === 'string' &&
        recipe.id &&
        recipe.createdBy
      );
      
      console.log(`✅ Fetched ${backendRecipes.length} recipes from backend, ${validRecipes.length} valid`);
      setRecipes(validRecipes);
      setFilteredRecipes(validRecipes);
    } catch (error) {
      console.error('💥 Error fetching recipes:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch recipes');
      setRecipes([]);
      setFilteredRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter recipes based on search term (enhanced search)
  useEffect(() => {
    // Filter out null/undefined recipes and ensure they have required properties
    const validRecipes = recipes.filter(recipe => 
      recipe && 
      recipe.name && 
      typeof recipe.name === 'string' &&
      recipe.id &&
      recipe.createdBy
    );

    if (!searchTerm.trim()) {
      setFilteredRecipes(validRecipes);
    } else {
      const query = searchTerm.toLowerCase();
      const filtered = validRecipes.filter(recipe => {
        // Search in recipe name
        if (recipe.name && recipe.name.toLowerCase().includes(query)) {
          return true;
        }
        
        // Search in creator name
        if (recipe.createdBy && recipe.createdBy.toLowerCase().includes(query)) {
          return true;
        }
        
        // If recipe has additional searchable fields, add them here
        // You can extend this based on what fields are available in your backend recipes
        
        return false;
      });
      setFilteredRecipes(filtered);
    }
  }, [searchTerm, recipes]);

  // Fetch recipes when component mounts or opens
  useEffect(() => {
    if (isOpen) {
      fetchRecipes();
    }
  }, [isOpen]);

  // Reset local selection when selectedRecipes prop changes
  useEffect(() => {
    setLocalSelection(selectedRecipes);
  }, [selectedRecipes]);

  const toggleRecipeSelection = (recipeName: string) => {
    // Safety check for recipeName
    if (!recipeName || typeof recipeName !== 'string') {
      console.warn('Invalid recipe name provided to toggleRecipeSelection:', recipeName);
      return;
    }

    setLocalSelection(prev => {
      if (prev.includes(recipeName)) {
        return prev.filter(name => name !== recipeName);
      } else {
        return [...prev, recipeName];
      }
    });
  };

  const handleSaveSelection = () => {
    onSelectRecipes(localSelection);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelection(selectedRecipes); // Reset to original selection
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Select Recipes from Repository
          </DialogTitle>
          <DialogDescription>
            Choose recipes from the backend repository to add to this demo request.
            {!isLoading && (
              <span className="text-muted-foreground">
                {` Showing ${filteredRecipes.length} of ${recipes.length} recipes.`}
              </span>
            )}
            {localSelection.length > 0 && (
              <span className="text-primary font-medium">
                {` (${localSelection.length} recipe${localSelection.length === 1 ? '' : 's'} selected)`}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Controls */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search recipes by name or chef..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={fetchRecipes}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading recipes from backend...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Failed to load recipes</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchRecipes}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Recipe Grid */}
          {!isLoading && !error && (
            <>
              {filteredRecipes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {filteredRecipes.map((recipe) => {
                    // Safety check for recipe object and name property
                    if (!recipe || !recipe.name || !recipe.id) {
                      return null;
                    }
                    
                    const isSelected = localSelection.includes(recipe.name);
                    
                    return (
                      <Card 
                        key={recipe.id} 
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                        }`}
                        onClick={() => recipe?.name && toggleRecipeSelection(recipe.name)}
                      >
                        {/* Recipe Image */}
                        <div className="aspect-video relative bg-gray-100 rounded-t-lg overflow-hidden">
                          <RecipeImageWithFallback 
                            recipe={recipe} 
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Selection Indicator */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                              <Check className="h-4 w-4" />
                            </div>
                          )}
                        </div>

                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg line-clamp-2">{recipe.name}</CardTitle>
                        </CardHeader>

                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <ChefHat className="h-3 w-3" />
                              <span>{recipe.createdBy || 'Unknown'}</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {recipe.jsonLink && (
                                <FileText className="h-3 w-3" />
                              )}
                            </div>
                          </div>

                          <div className="mt-2">
                            {isSelected ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                ✓ Selected
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                Click to select
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ChefHat className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    {searchTerm ? 'No recipes found' : 'No recipes available'}
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm 
                      ? 'Try adjusting your search term or clear the search to see all recipes.' 
                      : 'Add some recipes to the repository to get started.'
                    }
                  </p>
                  {searchTerm && (
                    <Button 
                      variant="outline" 
                      onClick={() => setSearchTerm('')}
                      className="mt-3"
                    >
                      Clear Search
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {localSelection.length} recipe{localSelection.length === 1 ? '' : 's'} selected
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveSelection} disabled={localSelection.length === 0}>
              <Check className="h-4 w-4 mr-2" />
              Add Selected Recipes ({localSelection.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}