import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Search, Plus, Download, Edit, Trash2, Upload, ExternalLink, Image, Video, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { User, Recipe } from '../App';
import { convertGoogleDriveUrl, isGoogleDriveUrl, getFallbackImageUrl } from '../utils/imageUtils';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface RecipeRepositoryProps {
  user: User;
  selectionMode?: boolean;
  selectedRecipes?: string[];
  onRecipeSelect?: (recipes: string[]) => void;
}

export function RecipeRepositoryV2({
  user,
  selectionMode = false,
  selectedRecipes = [],
  onRecipeSelect
}: RecipeRepositoryProps) {
  // Guard against null user
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>User information not available</p>
        </div>
      </div>
    );
  }
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportData, setBulkImportData] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [retryingImages, setRetryingImages] = useState<Set<string>>(new Set());
  const [apiError, setApiError] = useState<string | null>(null);

  // New recipe form state
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    imageLink: '',
    jsonLink: ''
  });

  // API helper functions
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

  const fetchRecipes = async () => {
    try {
      setIsLoading(true);
      setApiError(null);
      const result = await apiCall('/recipes');
      setRecipes(result.data || []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to fetch recipes');
      
      // Fallback to empty array on error
      setRecipes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  useEffect(() => {
    const filtered = recipes.filter(recipe =>
      recipe && recipe.name && recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    // Sort filtered recipes alphabetically by name
    filtered.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    setFilteredRecipes(filtered);
  }, [recipes, searchTerm]);

  const handleAddRecipe = async () => {
    if (!newRecipe.name || !newRecipe.imageLink) return;

    try {
      setIsLoading(true);
      const result = await apiCall('/recipes', {
        method: 'POST',
        body: JSON.stringify({
          name: newRecipe.name,
          imageLink: newRecipe.imageLink,
          jsonLink: newRecipe.jsonLink || null,
          createdBy: user.name
        })
      });

      setRecipes(prev => [...prev, result.data]);
      setNewRecipe({ name: '', imageLink: '', jsonLink: '' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding recipe:', error);
      alert(`Failed to add recipe: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRecipe = async () => {
    if (!editingRecipe) return;

    try {
      setIsLoading(true);
      const result = await apiCall(`/recipes/${editingRecipe.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingRecipe.name,
          imageLink: editingRecipe.imageLink,
          jsonLink: editingRecipe.jsonLink
        })
      });

      setRecipes(prev => prev.map(r => 
        r.id === editingRecipe.id ? result.data : r
      ));
      setEditingRecipe(null);
    } catch (error) {
      console.error('Error updating recipe:', error);
      alert(`Failed to update recipe: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      setIsLoading(true);
      await apiCall(`/recipes/${recipeId}`, {
        method: 'DELETE'
      });

      setRecipes(prev => prev.filter(r => r.id !== recipeId));
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert(`Failed to delete recipe: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkImportData.trim()) return;

    try {
      setIsLoading(true);
      const lines = bulkImportData.trim().split('\n');
      const newRecipes = [];
      
      for (const line of lines) {
        const parts = line.split('\t'); // Assuming tab-separated values from Excel
        if (parts.length >= 2) {
          newRecipes.push({
            name: parts[0].trim(),
            imageLink: parts[1].trim(),
            jsonLink: parts[2]?.trim() || null,
            createdBy: user.name
          });
        }
      }

      if (newRecipes.length === 0) {
        alert('No valid recipes found in the data. Please check the format.');
        return;
      }

      const result = await apiCall('/recipes/bulk', {
        method: 'POST',
        body: JSON.stringify({ recipes: newRecipes })
      });

      setRecipes(prev => [...prev, ...result.data.imported]);
      setBulkImportData('');
      setShowBulkImport(false);
      
      let message = `Successfully imported ${result.data.importedCount} recipes!`;
      if (result.data.errorCount > 0) {
        message += `\n\n${result.data.errorCount} recipes had errors:\n${result.data.errors.join('\n')}`;
      }
      alert(message);
    } catch (error) {
      console.error('Error bulk importing recipes:', error);
      alert(`Failed to import recipes: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllRecipes = async () => {
    if (!confirm('Are you sure you want to clear all recipes? This action cannot be undone.')) return;
    
    try {
      setIsLoading(true);
      const result = await apiCall('/recipes', {
        method: 'DELETE'
      });

      setRecipes([]);
      setShowClearConfirm(false);
      alert(`All recipes have been cleared. (${result.deletedCount} recipes deleted)`);
    } catch (error) {
      console.error('Error clearing recipes:', error);
      alert(`Failed to clear recipes: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleRecipeSelection = (recipeName: string) => {
    if (!selectionMode || !onRecipeSelect) return;

    const newSelection = selectedRecipes.includes(recipeName)
      ? selectedRecipes.filter(r => r !== recipeName)
      : [...selectedRecipes, recipeName];

    onRecipeSelect(newSelection);
  };

  const handleRetryImage = (recipeId: string) => {
    setRetryingImages(prev => new Set([...prev, recipeId]));
    setImageErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(recipeId);
      return newSet;
    });
    
    // Reset retry state after a brief delay
    setTimeout(() => {
      setRetryingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(recipeId);
        return newSet;
      });
    }, 1000);
  };

  const getImageUrl = (recipe: Recipe): string => {
    if (!recipe.imageLink) return '';
    
    // Convert Google Drive URLs to direct image URLs
    if (isGoogleDriveUrl(recipe.imageLink)) {
      const convertedUrl = convertGoogleDriveUrl(recipe.imageLink);
      console.log(`Recipe "${recipe.name}": Original URL:`, recipe.imageLink);
      console.log(`Recipe "${recipe.name}": Converted URL:`, convertedUrl);
      return convertedUrl;
    }
    
    return recipe.imageLink;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Recipe Repository</h2>
          <p className="text-gray-600 mt-1">
            {selectionMode ? 'Select recipes for your request' : 'Manage and browse recipe collection'}
          </p>
          {apiError && (
            <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
              <AlertCircle className="h-4 w-4" />
              <span>Backend Error: {apiError}</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={fetchRecipes}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchRecipes}
            disabled={isLoading}
          >
            <RefreshCw className={`size-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {recipes.length > 0 && !selectionMode && (
            <Button 
              variant="destructive" 
              onClick={() => setShowClearConfirm(true)}
              disabled={isLoading}
            >
              <Trash2 className="size-4 mr-2" />
              Clear All
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowBulkImport(true)}>
            <Upload className="size-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="size-4 mr-2" />
            Add Recipe
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 size-4" />
        <Input
          placeholder="Search recipes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            Loading recipes...
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            {searchTerm ? 'No recipes found matching your search.' : 'No recipes available. Add some recipes to get started!'}
          </div>
        ) : (
          filteredRecipes.map((recipe) => (
            <Card 
              key={recipe.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectionMode && selectedRecipes.includes(recipe.name)
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : ''
              }`}
              onClick={() => selectionMode && toggleRecipeSelection(recipe.name)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{recipe.name}</CardTitle>
                  {!selectionMode && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRecipe(recipe);
                        }}
                      >
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRecipe(recipe.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Recipe Image Preview */}
                {recipe.imageLink && (
                  <div className="mb-4 relative">
                    {imageErrors.has(recipe.id) ? (
                      <div className="w-full h-32 bg-gray-100 rounded-md flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                        <div className="text-center text-gray-500">
                          <Image className="size-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm mb-2">Image not available</p>
                          {isGoogleDriveUrl(recipe.imageLink) && (
                            <p className="text-xs text-gray-400 mb-2">Google Drive link detected</p>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetryImage(recipe.id);
                            }}
                            disabled={retryingImages.has(recipe.id)}
                            className="text-xs"
                          >
                            {retryingImages.has(recipe.id) ? (
                              <>
                                <RefreshCw className="size-3 mr-1 animate-spin" />
                                Retrying...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="size-3 mr-1" />
                                Retry
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={getImageUrl(recipe)}
                        alt={recipe.name}
                        className="w-full h-32 object-cover rounded-md"
                        onError={(e) => {
                          console.log('Image failed to load:', getImageUrl(recipe));
                          // Only update if not already in error state
                          if (!imageErrors.has(recipe.id)) {
                            setImageErrors(prev => new Set([...prev, recipe.id]));
                          }
                        }}
                        onLoad={(e) => {
                          console.log('Image loaded successfully:', getImageUrl(recipe));
                          // Remove from error state if image loads successfully
                          if (imageErrors.has(recipe.id)) {
                            setImageErrors(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(recipe.id);
                              return newSet;
                            });
                          }
                        }}
                      />
                    )}
                    {isGoogleDriveUrl(recipe.imageLink) && !imageErrors.has(recipe.id) && (
                      <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                        Google Drive
                      </Badge>
                    )}
                  </div>
                )}

                {/* Download Links */}
                <div className="space-y-2">
                  {recipe.imageLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(recipe.imageLink, `${recipe.name}_image`);
                      }}
                    >
                      <Image className="size-4 mr-2" />
                      Download Image
                    </Button>
                  )}

                  {recipe.jsonLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(recipe.jsonLink, `${recipe.name}_recipe.json`);
                      }}
                    >
                      <FileText className="size-4 mr-2" />
                      Download JSON
                    </Button>
                  )}
                </div>

                {selectionMode && selectedRecipes.includes(recipe.name) && (
                  <Badge className="mt-2 bg-blue-100 text-blue-800">Selected</Badge>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Recipe Modal */}
      {showAddModal && (
        <Dialog open={true} onOpenChange={() => setShowAddModal(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Recipe</DialogTitle>
              <DialogDescription>
                Add a new recipe to the repository with name, image, and optional JSON file links.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Recipe Name *</Label>
                <Input
                  id="name"
                  value={newRecipe.name}
                  onChange={(e) => setNewRecipe(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter recipe name"
                />
              </div>
              <div>
                <Label htmlFor="imageLink">Image Link *</Label>
                <Input
                  id="imageLink"
                  value={newRecipe.imageLink}
                  onChange={(e) => setNewRecipe(prev => ({ ...prev, imageLink: e.target.value }))}
                  placeholder="https://example.com/image.jpg or Google Drive link"
                />
                {isGoogleDriveUrl(newRecipe.imageLink) && (
                  <p className="text-xs text-blue-600 mt-1">
                    Google Drive link detected - will be converted to direct image URL
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="jsonLink">JSON Recipe Link</Label>
                <Input
                  id="jsonLink"
                  value={newRecipe.jsonLink}
                  onChange={(e) => setNewRecipe(prev => ({ ...prev, jsonLink: e.target.value }))}
                  placeholder="https://example.com/recipe.json"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddRecipe} 
                  disabled={!newRecipe.name || !newRecipe.imageLink || isLoading}
                >
                  {isLoading ? 'Adding...' : 'Add Recipe'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Recipe Modal */}
      {editingRecipe && (
        <Dialog open={true} onOpenChange={() => setEditingRecipe(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Recipe</DialogTitle>
              <DialogDescription>
                Update the recipe information including name, image link, and JSON file link.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">Recipe Name *</Label>
                <Input
                  id="editName"
                  value={editingRecipe.name}
                  onChange={(e) => setEditingRecipe(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="Enter recipe name"
                />
              </div>
              <div>
                <Label htmlFor="editImageLink">Image Link *</Label>
                <Input
                  id="editImageLink"
                  value={editingRecipe.imageLink}
                  onChange={(e) => setEditingRecipe(prev => prev ? { ...prev, imageLink: e.target.value } : null)}
                  placeholder="https://example.com/image.jpg or Google Drive link"
                />
                {isGoogleDriveUrl(editingRecipe.imageLink) && (
                  <p className="text-xs text-blue-600 mt-1">
                    Google Drive link detected - will be converted to direct image URL
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="editJsonLink">JSON Recipe Link</Label>
                <Input
                  id="editJsonLink"
                  value={editingRecipe.jsonLink || ''}
                  onChange={(e) => setEditingRecipe(prev => prev ? { ...prev, jsonLink: e.target.value } : null)}
                  placeholder="https://example.com/recipe.json"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingRecipe(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleEditRecipe} 
                  disabled={!editingRecipe.name || !editingRecipe.imageLink || isLoading}
                >
                  {isLoading ? 'Updating...' : 'Update Recipe'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <Dialog open={true} onOpenChange={() => setShowBulkImport(false)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Bulk Import Recipes from Excel</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              <p className="text-sm text-blue-800">
                <strong>Format:</strong> Copy and paste data from Excel with columns: Name, Image Link, JSON Link (optional)
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Each row should be on a new line with columns separated by tabs.
              </p>
            </DialogDescription>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bulkData">Excel Data</Label>
                <textarea
                  id="bulkData"
                  value={bulkImportData}
                  onChange={(e) => setBulkImportData(e.target.value)}
                  placeholder="Paste your Excel data here...&#10;Recipe Name 1	https://image1.jpg	https://recipe1.json&#10;Recipe Name 2	https://image2.jpg	https://recipe2.json"
                  className="w-full h-32 p-3 border rounded-md resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBulkImport(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkImport} 
                  disabled={!bulkImportData.trim() || isLoading}
                >
                  {isLoading ? 'Importing...' : 'Import Recipes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <Dialog open={true} onOpenChange={() => setShowClearConfirm(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear All Recipes</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete all recipes? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleClearAllRecipes}
                disabled={isLoading}
              >
                {isLoading ? 'Clearing...' : 'Clear All Recipes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}