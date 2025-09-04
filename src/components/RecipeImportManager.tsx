import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Upload,
  Download,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
  ChefHat,
  FileText,
  RefreshCw,
  Database,
  Import
} from 'lucide-react';
import { User as UserType } from '../App';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { RECIPE_REPOSITORY_CSV_URL } from '../utils/constants';
import { transformRecipeCsvData } from '../utils/csvTransformers';

interface RecipeImportManagerProps {
  user: UserType;
  onClose?: () => void;
}

interface BackendRecipe {
  id?: string;
  name?: string;
  imageLink?: string;
  jsonLink?: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ImportResult {
  imported: BackendRecipe[];
  skipped: Array<{ name: string; reason: string }>;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
}

export function RecipeImportManager({ user, onClose }: RecipeImportManagerProps) {
  // Safety check for user
  if (!user) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto p-6">
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>User not found. Please log in to manage recipes.</p>
        </div>
      </div>
    );
  }
  const [recipes, setRecipes] = useState<BackendRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [newRecipe, setNewRecipe] = useState({
    name: '',
    imageLink: '',
    jsonLink: ''
  });
  const [isFetchingFromSheets, setIsFetchingFromSheets] = useState(false);
  const [sheetsImportResult, setSheetsImportResult] = useState<ImportResult | null>(null);

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
      const result = await apiCall('/recipes');
      
      // Ensure result.data is an array and filter out any null/undefined recipes
      const rawData = Array.isArray(result.data) ? result.data : [];
      
      // Filter out any null/undefined recipes and ensure they have required properties
      const validRecipes = rawData.filter((recipe: any) => 
        recipe && 
        typeof recipe === 'object' &&
        recipe.id &&
        recipe.name &&
        recipe.imageLink &&
        recipe.createdBy
      );
      
      console.log(`✅ Fetched ${rawData.length} recipes from backend, ${validRecipes.length} valid`);
      setRecipes(validRecipes);
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      setRecipes([]); // Ensure we set an empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  // Parse import text and create recipe objects
  const parseImportText = (text: string): Array<{ name: string; imageLink?: string; jsonLink?: string }> => {
    const lines = text.split('\n').filter(line => line.trim());
    const recipes = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Support different formats:
      // 1. Just recipe name: "Paneer Tikka"
      // 2. Name with image: "Paneer Tikka | https://example.com/image.jpg"
      // 3. Name with image and JSON: "Paneer Tikka | https://example.com/image.jpg | https://example.com/recipe.json"
      
      const parts = trimmed.split('|').map(part => part.trim());
      const recipe: { name: string; imageLink?: string; jsonLink?: string } = {
        name: parts[0]
      };

      if (parts[1] && parts[1].startsWith('http')) {
        recipe.imageLink = parts[1];
      }

      if (parts[2] && parts[2].startsWith('http')) {
        recipe.jsonLink = parts[2];
      }

      recipes.push(recipe);
    }

    return recipes;
  };

  // Handle bulk import
  const handleBulkImport = async () => {
    if (!importText.trim()) return;

    try {
      setIsImporting(true);
      setImportResult(null);

      const parsedRecipes = parseImportText(importText);
      
      // Add createdBy to each recipe
      const recipesToImport = parsedRecipes.map(recipe => ({
        ...recipe,
        createdBy: user?.name || 'Unknown User'
      }));

      console.log('Importing recipes:', recipesToImport);

      const result = await apiCall('/recipes/bulk', {
        method: 'POST',
        body: JSON.stringify({ recipes: recipesToImport })
      });

      setImportResult(result.data);
      setImportText(''); // Clear the import text on success
      
      // Refresh the recipes list
      await fetchRecipes();

    } catch (error) {
      console.error('Bulk import failed:', error);
      setImportResult({
        imported: [],
        skipped: [],
        importedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Handle single recipe creation
  const handleCreateSingleRecipe = async () => {
    if (!newRecipe.name.trim()) return;

    try {
      const recipe = {
        name: newRecipe.name.trim(),
        imageLink: newRecipe.imageLink.trim() || 
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&auto=format&q=80',
        jsonLink: newRecipe.jsonLink.trim() || null,
        createdBy: user?.name || 'Unknown User'
      };

      await apiCall('/recipes', {
        method: 'POST',
        body: JSON.stringify(recipe)
      });

      // Clear form and refresh
      setNewRecipe({ name: '', imageLink: '', jsonLink: '' });
      await fetchRecipes();

    } catch (error) {
      console.error('Failed to create recipe:', error);
    }
  };

  // Handle recipe deletion
  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      await apiCall(`/recipes/${recipeId}`, {
        method: 'DELETE'
      });
      
      await fetchRecipes();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
    }
  };

  // Clear all recipes
  const handleClearAllRecipes = async () => {
    if (!confirm('Are you sure you want to delete ALL recipes? This action cannot be undone.')) return;

    try {
      await apiCall('/recipes', {
        method: 'DELETE'
      });
      
      setRecipes([]);
    } catch (error) {
      console.error('Failed to clear recipes:', error);
    }
  };

  // Fetch recipes from Google Sheets CSV
  const handleFetchFromGoogleSheets = async () => {
    setIsFetchingFromSheets(true);
    setSheetsImportResult(null);
    
    try {
      console.log('📊 RECIPE SHEETS - Starting fetch from:', RECIPE_REPOSITORY_CSV_URL);
      
      // Fetch CSV data from Google Sheets
      const response = await fetch(RECIPE_REPOSITORY_CSV_URL, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv,text/plain,application/csv,*/*',
          'User-Agent': 'On2Cook-RecipeImport/1.0'
        },
        mode: 'cors',
        credentials: 'omit',
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recipe data: HTTP ${response.status}`);
      }

      const csvText = await response.text();
      console.log('📊 RECIPE SHEETS - CSV data received, length:', csvText.length);
      
      if (!csvText || csvText.length < 10) {
        throw new Error('Recipe CSV data is empty or too short');
      }

      // Parse CSV data
      const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalizedText.split('\n').filter(line => line.trim().length > 0);
      
      const csvData = lines.map(line => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
              current += '"';
              i++; // Skip next quote
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        result.push(current.trim());
        
        return result.map(col => {
          const trimmed = col.trim();
          if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            return trimmed.slice(1, -1);
          }
          return trimmed;
        });
      });

      console.log('📊 RECIPE SHEETS - CSV parsed, rows:', csvData.length);
      
      // Transform CSV data to recipe format
      const transformedRecipes = transformRecipeCsvData(csvData);
      console.log('📊 RECIPE SHEETS - Recipes transformed:', transformedRecipes.length);

      if (transformedRecipes.length === 0) {
        throw new Error('No valid recipes found in the CSV data');
      }

      // Import recipes to backend
      const recipesToImport = transformedRecipes.map(recipe => ({
        name: recipe.name,
        imageLink: recipe.imageLink,
        jsonLink: recipe.jsonLink,
        createdBy: `${user?.name || 'Unknown'} (via Sheets Import)`
      }));

      const result = await apiCall('/recipes/bulk', {
        method: 'POST',
        body: JSON.stringify({ recipes: recipesToImport })
      });

      setSheetsImportResult(result.data);
      
      // Refresh the recipes list
      await fetchRecipes();

      console.log('✅ RECIPE SHEETS - Import completed successfully');

    } catch (error) {
      console.error('❌ RECIPE SHEETS - Import failed:', error);
      setSheetsImportResult({
        imported: [],
        skipped: [],
        importedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error during Google Sheets import']
      });
    } finally {
      setIsFetchingFromSheets(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Recipe Repository Manager
          </h1>
          <p className="text-muted-foreground">
            Import, manage, and organize recipes for demo requests
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      <Tabs defaultValue="sheets-import" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="import">Bulk Import</TabsTrigger>
          <TabsTrigger value="sheets-import">From Google Sheets</TabsTrigger>
          <TabsTrigger value="manage">Manage Repository</TabsTrigger>
          <TabsTrigger value="add-single">Add Single Recipe</TabsTrigger>
        </TabsList>

        {/* Google Sheets Import Tab */}
        <TabsContent value="sheets-import">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Import from Google Sheets
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Import recipes directly from the Google Sheets recipe repository
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">Google Sheets Recipe Import</div>
                    <div className="text-sm">
                      This will fetch recipes from the configured Google Sheets URL and import them into the local repository.
                      The sheet should contain columns for: Recipe Name, Image Link, JSON Link, Category, Cuisine, Difficulty, etc.
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Source: {RECIPE_REPOSITORY_CSV_URL.split('/').pop()}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleFetchFromGoogleSheets}
                  disabled={isFetchingFromSheets}
                  size="lg"
                >
                  {isFetchingFromSheets ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Fetching from Sheets...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Import from Google Sheets
                    </>
                  )}
                </Button>
              </div>

              {/* Google Sheets Import Results */}
              {sheetsImportResult && (
                <Alert className={sheetsImportResult.errorCount > 0 ? 'border-red-200' : 'border-green-200'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">
                        Google Sheets Import Results: {sheetsImportResult.importedCount} imported, {sheetsImportResult.skippedCount} skipped, {sheetsImportResult.errorCount} errors
                      </div>
                      
                      {sheetsImportResult.importedCount > 0 && (
                        <div>
                          <div className="font-medium text-green-700">✅ Successfully Imported from Sheets:</div>
                          <div className="text-sm">
                            {sheetsImportResult.imported
                              .filter(recipe => recipe && recipe.name)
                              .map(recipe => recipe.name)
                              .join(', ')}
                          </div>
                        </div>
                      )}
                      
                      {sheetsImportResult.skippedCount > 0 && (
                        <div>
                          <div className="font-medium text-yellow-700">⏭️ Skipped (Already Exist):</div>
                          <div className="text-sm">
                            {sheetsImportResult.skipped
                              .filter(item => item && item.name)
                              .map(item => item.name)
                              .join(', ')}
                          </div>
                        </div>
                      )}
                      
                      {sheetsImportResult.errorCount > 0 && (
                        <div>
                          <div className="font-medium text-red-700">❌ Errors:</div>
                          <div className="text-sm">
                            {sheetsImportResult.errors.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Bulk Import Tab */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Import className="h-5 w-5" />
                Manual Bulk Recipe Import
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manually enter recipe names and URLs for bulk import
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="import-text">Recipe List</Label>
                <Textarea
                  id="import-text"
                  placeholder={`Enter recipe names, one per line. Supported formats:
Recipe Name
Recipe Name | https://image-url.com/image.jpg
Recipe Name | https://image-url.com/image.jpg | https://json-url.com/recipe.json

Example:
Paneer Tikka
Dal Makhani | https://example.com/dal-image.jpg
Butter Chicken | https://example.com/butter-chicken.jpg | https://example.com/recipe.json`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={12}
                />
                <div className="text-sm text-muted-foreground">
                  {importText.trim() ? `Ready to import ${parseImportText(importText).length} recipes` : 'Enter recipe names above'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleBulkImport}
                  disabled={!importText.trim() || isImporting}
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Recipes
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setImportText('')}
                  disabled={!importText.trim()}
                >
                  Clear
                </Button>
              </div>

              {/* Import Results */}
              {importResult && (
                <Alert className={importResult.errorCount > 0 ? 'border-red-200' : 'border-green-200'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">
                        Import Results: {importResult.importedCount} imported, {importResult.skippedCount} skipped, {importResult.errorCount} errors
                      </div>
                      
                      {importResult.importedCount > 0 && (
                        <div>
                          <div className="font-medium text-green-700">✅ Successfully Imported:</div>
                          <div className="text-sm">
                            {importResult.imported
                              .filter(recipe => recipe && recipe.name)
                              .map(recipe => recipe.name)
                              .join(', ')}
                          </div>
                        </div>
                      )}
                      
                      {importResult.skippedCount > 0 && (
                        <div>
                          <div className="font-medium text-yellow-700">⏭️ Skipped (Already Exist):</div>
                          <div className="text-sm">
                            {importResult.skipped
                              .filter(item => item && item.name)
                              .map(item => item.name)
                              .join(', ')}
                          </div>
                        </div>
                      )}
                      
                      {importResult.errorCount > 0 && (
                        <div>
                          <div className="font-medium text-red-700">❌ Errors:</div>
                          <div className="text-sm">
                            {importResult.errors.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Tab */}
        <TabsContent value="manage">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Recipe Repository ({recipes.length} recipes)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    onClick={fetchRecipes}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  {recipes.length > 0 && (
                    <Button 
                      variant="destructive"
                      onClick={handleClearAllRecipes}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Loading recipes...</p>
                </div>
              ) : recipes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recipes in repository</p>
                  <p className="text-sm">Import some recipes to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recipes
                    .filter(recipe => recipe && recipe.id && recipe.name && recipe.imageLink) // Additional safety filter
                    .map((recipe) => (
                    <Card key={recipe.id} className="overflow-hidden">
                      <div className="aspect-video relative bg-gray-100">
                        <img
                          src={recipe.imageLink || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&auto=format&q=80'}
                          alt={recipe.name || 'Recipe'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&auto=format&q=80';
                          }}
                        />
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-medium truncate">{recipe.name || 'Unnamed Recipe'}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <ChefHat className="h-3 w-3" />
                          <span>{recipe.createdBy || 'Unknown'}</span>
                        </div>
                        {recipe.jsonLink && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            Has JSON
                          </Badge>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteRecipe(recipe.id)}
                          className="w-full mt-3"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Add Single Recipe Tab */}
        <TabsContent value="add-single">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Single Recipe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipe-name">Recipe Name *</Label>
                <Input
                  id="recipe-name"
                  value={newRecipe.name}
                  onChange={(e) => setNewRecipe({...newRecipe, name: e.target.value})}
                  placeholder="Enter recipe name..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipe-image">Image URL (optional)</Label>
                <Input
                  id="recipe-image"
                  value={newRecipe.imageLink}
                  onChange={(e) => setNewRecipe({...newRecipe, imageLink: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
                <div className="text-sm text-muted-foreground">
                  Leave blank to use default recipe image
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipe-json">JSON Recipe URL (optional)</Label>
                <Input
                  id="recipe-json"
                  value={newRecipe.jsonLink}
                  onChange={(e) => setNewRecipe({...newRecipe, jsonLink: e.target.value})}
                  placeholder="https://example.com/recipe.json"
                />
              </div>

              <Button 
                onClick={handleCreateSingleRecipe}
                disabled={!newRecipe.name.trim()}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Recipe to Repository
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}