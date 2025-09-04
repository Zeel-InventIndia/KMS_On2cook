import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Search, Plus, Clock, Users, ChefHat, Star, Eye, ExternalLink, 
  Filter, Download, Play, ImageIcon, FileText, Utensils, Heart
} from 'lucide-react';
import { Recipe, RecipeFilter } from '../types/Recipe';
import { mockRecipes, getPopularRecipes, searchRecipes } from '../data/mockRecipes';
import { User as UserType } from '../App';
import { ToastContainer, ToastProps } from './Toast';

interface RecipeRepositoryProps {
  user: UserType;
  onSelectRecipe?: (recipe: Recipe) => void;
  selectionMode?: boolean;
  onClose?: () => void;
}

export function RecipeRepository({ 
  user, 
  onSelectRecipe, 
  selectionMode = false,
  onClose 
}: RecipeRepositoryProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(mockRecipes);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>(mockRecipes);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [activeTab, setActiveTab] = useState('all');

  const addToast = (toast: Omit<ToastProps, 'id'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    let filtered = recipes;

    // Apply search filter
    if (searchQuery) {
      filtered = searchRecipes(searchQuery);
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(recipe => recipe.category === selectedCategory);
    }

    // Apply cuisine filter
    if (selectedCuisine !== 'all') {
      filtered = filtered.filter(recipe => recipe.cuisine === selectedCuisine);
    }

    // Apply difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(recipe => recipe.difficulty === selectedDifficulty);
    }

    // Apply tab filter
    if (activeTab === 'popular') {
      filtered = getPopularRecipes(20);
    } else if (activeTab === 'recent') {
      filtered = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    setFilteredRecipes(filtered);
  }, [searchQuery, selectedCategory, selectedCuisine, selectedDifficulty, activeTab, recipes]);

  const handleRecipeSelect = (recipe: Recipe) => {
    if (selectionMode && onSelectRecipe) {
      onSelectRecipe(recipe);
      if (onClose) onClose();
      addToast({
        type: 'success',
        title: 'Recipe Selected',
        message: `${recipe.name} has been added to your request.`
      });
    } else {
      setSelectedRecipe(recipe);
    }
  };

  const handleAddRecipe = (newRecipeData: Partial<Recipe>) => {
    const newRecipe: Recipe = {
      id: `recipe-${Date.now()}`,
      name: newRecipeData.name || '',
      description: newRecipeData.description || '',
      category: newRecipeData.category || 'main_course',
      cuisine: newRecipeData.cuisine || 'other',
      preparationTime: newRecipeData.preparationTime || 30,
      cookingTime: newRecipeData.cookingTime || 30,
      servings: newRecipeData.servings || 4,
      difficulty: newRecipeData.difficulty || 'medium',
      ingredients: newRecipeData.ingredients || [],
      instructions: newRecipeData.instructions || [],
      tags: newRecipeData.tags || [],
      nutritionalInfo: newRecipeData.nutritionalInfo,
      media: {
        imageUrl: newRecipeData.media?.imageUrl,
        videoUrl: newRecipeData.media?.videoUrl,
        jsonUrl: newRecipeData.media?.jsonUrl
      },
      createdBy: user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: true,
      usageCount: 0,
      rating: 0,
      reviews: 0
    };

    setRecipes(prev => [...prev, newRecipe]);
    setShowAddRecipe(false);
    
    addToast({
      type: 'success',
      title: 'Recipe Added',
      message: `${newRecipe.name} has been added to the repository.`
    });
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'appetizer', label: 'Appetizers' },
    { value: 'main_course', label: 'Main Course' },
    { value: 'dessert', label: 'Desserts' },
    { value: 'beverage', label: 'Beverages' },
    { value: 'snack', label: 'Snacks' },
    { value: 'fusion', label: 'Fusion' },
    { value: 'traditional', label: 'Traditional' },
    { value: 'healthy', label: 'Healthy' }
  ];

  const cuisines = [
    { value: 'all', label: 'All Cuisines' },
    { value: 'indian', label: 'Indian' },
    { value: 'chinese', label: 'Chinese' },
    { value: 'continental', label: 'Continental' },
    { value: 'italian', label: 'Italian' },
    { value: 'mexican', label: 'Mexican' },
    { value: 'thai', label: 'Thai' },
    { value: 'fusion', label: 'Fusion' },
    { value: 'other', label: 'Other' }
  ];

  const difficulties = [
    { value: 'all', label: 'All Levels' },
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'appetizer': return '🥗';
      case 'main_course': return '🍛';
      case 'dessert': return '🍰';
      case 'beverage': return '🥤';
      case 'snack': return '🍿';
      default: return '🍽️';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Recipe Repository</h2>
          <p className="text-muted-foreground">
            {selectionMode 
              ? 'Select recipes for your demo or deployment request'
              : 'Explore and manage our complete collection of recipes'
            }
          </p>
        </div>
        {!selectionMode && (
          <Button onClick={() => setShowAddRecipe(true)}>
            <Plus className="size-4 mr-2" />
            Add Recipe
          </Button>
        )}
        {selectionMode && onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search Recipes</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ingredient, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cuisine</Label>
              <Select value={selectedCuisine} onValueChange={setSelectedCuisine}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cuisines.map(cuisine => (
                    <SelectItem key={cuisine.value} value={cuisine.value}>
                      {cuisine.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map(diff => (
                    <SelectItem key={diff.value} value={diff.value}>
                      {diff.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Recipes ({filteredRecipes.length})</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Recipe Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map(recipe => (
              <Card 
                key={recipe.id} 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectionMode ? 'hover:border-primary' : ''
                }`}
                onClick={() => handleRecipeSelect(recipe)}
              >
                <div className="aspect-video relative bg-gray-100 rounded-t-lg overflow-hidden">
                  {recipe.media.imageUrl ? (
                    <img
                      src={recipe.media.imageUrl}
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Utensils className="size-8 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge className={getDifficultyColor(recipe.difficulty)}>
                      {recipe.difficulty}
                    </Badge>
                  </div>
                  {recipe.rating && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                      <Star className="size-3 fill-current" />
                      {recipe.rating}
                    </div>
                  )}
                </div>

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{recipe.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {recipe.description}
                      </p>
                    </div>
                    <div className="text-xl ml-2">
                      {getCategoryIcon(recipe.category)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {recipe.preparationTime + recipe.cookingTime}m
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="size-3" />
                      {recipe.servings} servings
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="size-3" />
                      {recipe.usageCount}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {recipe.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {recipe.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{recipe.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChefHat className="size-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{recipe.createdBy}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {recipe.media.videoUrl && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Play className="size-3" />
                        </Button>
                      )}
                      {recipe.media.jsonUrl && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Download className="size-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ExternalLink className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {selectionMode && (
                    <Button className="w-full mt-3" size="sm">
                      Select Recipe
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRecipes.length === 0 && (
            <div className="text-center py-12">
              <Utensils className="size-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No recipes found</h3>
              <p className="text-gray-500">Try adjusting your search criteria or add a new recipe.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Recipe Detail Modal */}
      {selectedRecipe && !selectionMode && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onSelect={onSelectRecipe}
        />
      )}

      {/* Add Recipe Modal */}
      {showAddRecipe && (
        <AddRecipeModal
          onClose={() => setShowAddRecipe(false)}
          onSave={handleAddRecipe}
          user={user}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

// Recipe Detail Modal Component
interface RecipeDetailModalProps {
  recipe: Recipe;
  onClose: () => void;
  onSelect?: (recipe: Recipe) => void;
}

function RecipeDetailModal({ recipe, onClose, onSelect }: RecipeDetailModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
          <DialogDescription>{recipe.description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recipe Image */}
          <div className="lg:col-span-1">
            {recipe.media.imageUrl ? (
              <img
                src={recipe.media.imageUrl}
                alt={recipe.name}
                className="w-full h-64 object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <Utensils className="size-12 text-gray-400" />
              </div>
            )}

            {/* Recipe Info */}
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Prep Time:</span>
                  <p className="font-medium">{recipe.preparationTime} min</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cook Time:</span>
                  <p className="font-medium">{recipe.cookingTime} min</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Servings:</span>
                  <p className="font-medium">{recipe.servings}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Difficulty:</span>
                  <Badge className={`${getDifficultyColor(recipe.difficulty)} text-xs`}>
                    {recipe.difficulty}
                  </Badge>
                </div>
              </div>

              {recipe.nutritionalInfo && (
                <div>
                  <h4 className="font-medium mb-2">Nutritional Info (per serving)</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Calories: {recipe.nutritionalInfo.calories}</div>
                    <div>Protein: {recipe.nutritionalInfo.protein}g</div>
                    <div>Carbs: {recipe.nutritionalInfo.carbs}g</div>
                    <div>Fat: {recipe.nutritionalInfo.fat}g</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recipe Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ingredients */}
            <div>
              <h3 className="text-lg font-medium mb-3">Ingredients</h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            <div>
              <h3 className="text-lg font-medium mb-3">Instructions</h3>
              <ol className="space-y-3">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-lg font-medium mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Media Links */}
            <div className="flex gap-3 pt-4">
              {recipe.media.videoUrl && (
                <Button variant="outline" className="flex-1">
                  <Play className="size-4 mr-2" />
                  Watch Video
                </Button>
              )}
              {recipe.media.jsonUrl && (
                <Button variant="outline" className="flex-1">
                  <Download className="size-4 mr-2" />
                  Download JSON
                </Button>
              )}
              {onSelect && (
                <Button onClick={() => onSelect(recipe)} className="flex-1">
                  <Plus className="size-4 mr-2" />
                  Select Recipe
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Add Recipe Modal Component
interface AddRecipeModalProps {
  onClose: () => void;
  onSave: (recipe: Partial<Recipe>) => void;
  user: UserType;
}

function AddRecipeModal({ onClose, onSave, user }: AddRecipeModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'main_course' as Recipe['category'],
    cuisine: 'indian' as Recipe['cuisine'],
    preparationTime: 30,
    cookingTime: 30,
    servings: 4,
    difficulty: 'medium' as Recipe['difficulty'],
    ingredients: '',
    instructions: '',
    tags: '',
    imageUrl: '',
    videoUrl: '',
    jsonUrl: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const recipe: Partial<Recipe> = {
      ...formData,
      ingredients: formData.ingredients.split('\n').filter(i => i.trim()),
      instructions: formData.instructions.split('\n').filter(i => i.trim()),
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      media: {
        imageUrl: formData.imageUrl || undefined,
        videoUrl: formData.videoUrl || undefined,
        jsonUrl: formData.jsonUrl || undefined
      }
    };

    onSave(recipe);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Recipe</DialogTitle>
          <DialogDescription>
            Create a new recipe for the repository. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Recipe Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value: Recipe['category']) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appetizer">Appetizer</SelectItem>
                  <SelectItem value="main_course">Main Course</SelectItem>
                  <SelectItem value="dessert">Dessert</SelectItem>
                  <SelectItem value="beverage">Beverage</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                  <SelectItem value="fusion">Fusion</SelectItem>
                  <SelectItem value="traditional">Traditional</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cuisine">Cuisine</Label>
              <Select 
                value={formData.cuisine} 
                onValueChange={(value: Recipe['cuisine']) => setFormData(prev => ({ ...prev, cuisine: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indian">Indian</SelectItem>
                  <SelectItem value="chinese">Chinese</SelectItem>
                  <SelectItem value="continental">Continental</SelectItem>
                  <SelectItem value="italian">Italian</SelectItem>
                  <SelectItem value="mexican">Mexican</SelectItem>
                  <SelectItem value="thai">Thai</SelectItem>
                  <SelectItem value="fusion">Fusion</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select 
                value={formData.difficulty} 
                onValueChange={(value: Recipe['difficulty']) => setFormData(prev => ({ ...prev, difficulty: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                min="1"
                value={formData.servings}
                onChange={(e) => setFormData(prev => ({ ...prev, servings: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prepTime">Prep Time (minutes)</Label>
              <Input
                id="prepTime"
                type="number"
                min="0"
                value={formData.preparationTime}
                onChange={(e) => setFormData(prev => ({ ...prev, preparationTime: parseInt(e.target.value) }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cookTime">Cook Time (minutes)</Label>
              <Input
                id="cookTime"
                type="number"
                min="0"
                value={formData.cookingTime}
                onChange={(e) => setFormData(prev => ({ ...prev, cookingTime: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ingredients">Ingredients (one per line) *</Label>
            <Textarea
              id="ingredients"
              value={formData.ingredients}
              onChange={(e) => setFormData(prev => ({ ...prev, ingredients: e.target.value }))}
              placeholder="500g chicken breast&#10;2 tbsp olive oil&#10;1 onion, diced"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions (one per line) *</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Heat oil in a large pan&#10;Add chicken and cook until golden&#10;Add onions and cook until soft"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="spicy, creamy, popular, demo-favorite"
            />
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Media Links (Optional)</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input
                  id="videoUrl"
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="https://example.com/video.mp4"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="jsonUrl">Recipe JSON URL</Label>
                <Input
                  id="jsonUrl"
                  type="url"
                  value={formData.jsonUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, jsonUrl: e.target.value }))}
                  placeholder="https://api.on2cook.com/recipes/recipe.json"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Add Recipe
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case 'easy': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'hard': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}