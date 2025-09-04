import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  RefreshCw, 
  Download, 
  ImageIcon, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  X
} from 'lucide-react';
import { User as UserType } from '../App';
import { RECIPE_REPOSITORY_CSV_URL } from '../utils/constants';
import { transformRecipeCsvData } from '../utils/csvTransformers';
import { getRecipeImageUrl, getRecipeCount } from '../utils/recipeImageMapping';
import { RecipeImageWithFallback } from './RecipeImageWithFallback';

interface RecipeRepositoryFromSheetsProps {
  user: UserType;
  onSelectRecipe?: (recipe: any) => void;
  selectionMode?: boolean;
  onClose?: () => void;
}

interface Recipe {
  id: string;
  name: string;
  imageLink: string;
  jsonLink?: string | null;
  category: string;
  cuisine: string;
  difficulty: string;
  description: string;
  tags: string[];
  preparationTime: number;
  cookingTime: number;
  servings: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Recipe image component using the new fallback system
function RecipeImage({ recipe }: { recipe: Recipe }) {
  return (
    <RecipeImageWithFallback 
      recipe={recipe} 
      className="w-full h-full object-cover"
    />
  );
}

export function RecipeRepositoryFromSheets({ 
  user, 
  onSelectRecipe, 
  selectionMode = false,
  onClose 
}: RecipeRepositoryFromSheetsProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch recipes from Google Sheets
  const fetchRecipesFromSheets = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📚 RECIPE REPOSITORY - Fetching from Google Sheets:', RECIPE_REPOSITORY_CSV_URL);
      
      const response = await fetch(RECIPE_REPOSITORY_CSV_URL, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv,text/plain,application/csv,*/*',
          'User-Agent': 'On2Cook-RecipeRepository/1.0'
        },
        mode: 'cors',
        credentials: 'omit',
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recipes: HTTP ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();
      console.log('📚 RECIPE REPOSITORY - CSV data received, length:', csvText.length);
      
      if (!csvText || csvText.length < 10) {
        throw new Error('Recipe data is empty or too short');
      }

      // Parse CSV data
      const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalizedText.split('\n').filter(line => line.trim().length > 0);
      
      // Debug: Log first few lines of raw CSV
      console.log('📄 RAW CSV CONTENT - First 5 lines:');
      lines.slice(0, 5).forEach((line, index) => {
        console.log(`Line ${index + 1}: ${line}`);
      });
      
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

      console.log('📚 RECIPE REPOSITORY - CSV parsed, rows:', csvData.length);
      
      // Debug: Log first few parsed rows
      console.log('📊 PARSED CSV DATA - First 3 rows:');
      csvData.slice(0, 3).forEach((row, index) => {
        console.log(`Row ${index + 1} (${row.length} columns):`, row);
      });
      
      // Transform CSV data to recipe format
      const transformedRecipes = transformRecipeCsvData(csvData);
      console.log('📚 RECIPE REPOSITORY - Recipes transformed:', transformedRecipes.length);

      // Debug image URLs
      console.log('🖼️ IMAGE DEBUG - Recipe image status:');
      transformedRecipes.forEach((recipe, index) => {
        const hasImage = recipe.imageLink && recipe.imageLink.length > 0;
        console.log(`${index + 1}. ${recipe.name}:`, {
          hasImageLink: hasImage,
          imageUrl: hasImage ? recipe.imageLink.substring(0, 80) + '...' : 'NO IMAGE LINK',
          urlType: !hasImage ? 'none' : 
                   recipe.imageLink.includes('drive.google.com') ? 'google-drive' :
                   recipe.imageLink.includes('http') ? 'direct-url' : 'other'
        });
      });

      // Count image types
      const imageStats = transformedRecipes.reduce((acc, recipe) => {
        if (!recipe.imageLink || recipe.imageLink.length === 0) {
          acc.noImage++;
        } else if (recipe.imageLink.includes('drive.google.com')) {
          acc.googleDrive++;
        } else if (recipe.imageLink.includes('http')) {
          acc.directUrl++;
        } else {
          acc.other++;
        }
        return acc;
      }, { noImage: 0, googleDrive: 0, directUrl: 0, other: 0 });
      
      console.log('📊 IMAGE STATS:', imageStats);

      setRecipes(transformedRecipes);
      setFilteredRecipes(transformedRecipes);
      setLastUpdate(new Date().toISOString());
      
    } catch (err) {
      console.error('📚 RECIPE REPOSITORY - Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRecipesFromSheets();
  }, []);

  // Filter recipes based on search query and filters
  useEffect(() => {
    let filtered = recipes;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recipe => 
        recipe.name.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query) ||
        recipe.category.toLowerCase().includes(query) ||
        recipe.cuisine.toLowerCase().includes(query) ||
        recipe.tags.some(tag => tag.toLowerCase().includes(query)) ||
        recipe.createdBy.toLowerCase().includes(query)
      );
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

    setFilteredRecipes(filtered);
  }, [recipes, searchQuery, selectedCategory, selectedCuisine, selectedDifficulty]);

  // Get unique values for filter dropdowns
  const getUniqueValues = (key: keyof Recipe) => {
    const values = [...new Set(recipes.map(recipe => recipe[key] as string))];
    return values.filter(value => value && value.trim().length > 0).sort();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedCuisine('all');
    setSelectedDifficulty('all');
  };

  const handleRecipeSelect = (recipe: Recipe) => {
    if (selectionMode && onSelectRecipe) {
      onSelectRecipe(recipe);
      if (onClose) onClose();
    }
  };

  const handleDownloadImage = (recipe: Recipe) => {
    if (recipe.imageLink) {
      const link = document.createElement('a');
      
      // Convert Google Drive URLs to direct download links
      let downloadUrl = recipe.imageLink;
      if (recipe.imageLink.includes('drive.google.com')) {
        const patterns = [
          /\/file\/d\/([a-zA-Z0-9-_]+)/,
          /id=([a-zA-Z0-9-_]+)/,
          /\/d\/([a-zA-Z0-9-_]+)/
        ];
        
        for (const pattern of patterns) {
          const match = recipe.imageLink.match(pattern);
          if (match) {
            const fileId = match[1];
            downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            break;
          }
        }
      }
      
      link.href = downloadUrl;
      link.download = `${recipe.name.replace(/[^a-zA-Z0-9]/g, '_')}_image`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDownloadJson = (recipe: Recipe) => {
    if (recipe.jsonLink) {
      const link = document.createElement('a');
      link.href = recipe.jsonLink;
      link.download = `${recipe.name.replace(/[^a-zA-Z0-9]/g, '_')}_recipe.json`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className={selectionMode ? "space-y-3" : "space-y-6"}>
      {/* Header - Hidden in selection mode */}
      {!selectionMode && (
        <div className="flex items-center justify-between">
          <div>
            <h2>Recipe Repository</h2>
            <p className="text-muted-foreground">
              {`Browse our complete collection of recipes from Google Sheets (${filteredRecipes.length} of ${recipes.length} recipes)`}
              {lastUpdate && (
                <span className="ml-2">
                  • Last updated: {new Date(lastUpdate).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-primary text-primary-foreground' : ''}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            
            <Button
              variant="outline"
              onClick={fetchRecipesFromSheets}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Minimal controls for selection mode */}
      {selectionMode && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-primary text-primary-foreground' : ''}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            
            {(searchQuery || selectedCategory !== 'all' || selectedCuisine !== 'all' || selectedDifficulty !== 'all') && (
              <span className="text-sm text-muted-foreground">
                {filteredRecipes.length} of {recipes.length} recipes
              </span>
            )}
          </div>
          
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      )}

      {/* Search and Filters */}
      {showFilters && (
        <Card className={`${selectionMode ? 'p-3' : 'p-4'}`}>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="space-y-2">
              {!selectionMode && <Label>Search Recipes</Label>}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, description, category, cuisine, tags, or chef name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                {!selectionMode && <Label>Category</Label>}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {getUniqueValues('category').map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {!selectionMode && <Label>Cuisine</Label>}
                <Select value={selectedCuisine} onValueChange={setSelectedCuisine}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Cuisines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cuisines</SelectItem>
                    {getUniqueValues('cuisine').map(cuisine => (
                      <SelectItem key={cuisine} value={cuisine}>
                        {cuisine}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {!selectionMode && <Label>Difficulty</Label>}
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Difficulties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    {getUniqueValues('difficulty').map(difficulty => (
                      <SelectItem key={difficulty} value={difficulty}>
                        {difficulty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters and Clear Button */}
            {(searchQuery || selectedCategory !== 'all' || selectedCuisine !== 'all' || selectedDifficulty !== 'all') && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex flex-wrap gap-2">
                  {searchQuery && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Search: "{searchQuery}"
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setSearchQuery('')}
                      />
                    </Badge>
                  )}
                  {selectedCategory !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Category: {selectedCategory}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setSelectedCategory('all')}
                      />
                    </Badge>
                  )}
                  {selectedCuisine !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Cuisine: {selectedCuisine}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setSelectedCuisine('all')}
                      />
                    </Badge>
                  )}
                  {selectedDifficulty !== 'all' && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Difficulty: {selectedDifficulty}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => setSelectedDifficulty('all')}
                      />
                    </Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div>{selectionMode ? 'Failed to load recipes' : 'Failed to load recipes'}</div>
            {!selectionMode && <div className="text-sm mt-1">{error}</div>}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchRecipesFromSheets}
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Display - Hidden in selection mode */}
      {!selectionMode && !error && !isLoading && recipes.length > 0 && (
        <Alert className="border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="text-green-700">
              Successfully loaded {recipes.length} recipes from Google Sheets
            </div>
            <div className="text-sm mt-1 text-green-600">
              {(() => {
                const mappedCount = recipes.filter(recipe => getRecipeImageUrl(recipe.name)).length;
                const totalMappedRecipes = getRecipeCount();
                return `${mappedCount} recipes with specific images • ${totalMappedRecipes} total mapped • Enhanced fallback system active`;
              })()}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading recipes from Google Sheets...</p>
        </div>
      )}

      {/* Recipe Grid - ULTRA COMPACT - 8+ RECIPES PER SCREEN */}
      {!isLoading && filteredRecipes.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2">
          {filteredRecipes.map(recipe => (
            <Card 
              key={recipe.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectionMode ? 'hover:border-primary' : ''
              } text-xs`}
              onClick={() => selectionMode && handleRecipeSelect(recipe)}
            >
              {/* Recipe Image - ULTRA COMPACT */}
              <div className="aspect-square relative bg-gray-100 rounded-t-lg overflow-hidden">
                <RecipeImage recipe={recipe} />
              </div>

              {/* Recipe Content - ULTRA COMPACT */}
              <CardContent className="p-1.5">
                {/* Recipe Name - ULTRA COMPACT */}
                <h4 className="mb-1.5 text-xs font-medium truncate leading-tight" title={recipe.name}>{recipe.name}</h4>
                
                {/* Download Buttons - ULTRA COMPACT - only show in browse mode */}
                {!selectionMode && (
                  <div className="flex items-center justify-center gap-0.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadImage(recipe);
                      }}
                      title="Download Image"
                      className="flex-1 h-6 text-xs px-1"
                    >
                      <ImageIcon className="h-2.5 w-2.5 mr-0.5" />
                      Img
                    </Button>
                    
                    {recipe.jsonLink && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadJson(recipe);
                        }}
                        title="Download Recipe JSON"
                        className="flex-1 h-6 text-xs px-1"
                      >
                        <FileText className="h-2.5 w-2.5 mr-0.5" />
                        JSON
                      </Button>
                    )}
                  </div>
                )}

                {/* Selection Button (only in selection mode) - ULTRA COMPACT */}
                {selectionMode && (
                  <Button className="w-full h-6 text-xs" size="sm">
                    Select
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Data */}
      {!isLoading && !error && recipes.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-gray-600 mb-2">No recipes available</h3>
          <p className="text-gray-500">Check the Google Sheets data source or try refreshing.</p>
        </div>
      )}

      {/* No Results After Filtering */}
      {!isLoading && !error && recipes.length > 0 && filteredRecipes.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-600 mb-2">No recipes match your search</h3>
          <p className="text-gray-500">Try adjusting your search terms or filters.</p>
          <Button 
            variant="outline" 
            onClick={clearFilters}
            className="mt-3"
          >
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}