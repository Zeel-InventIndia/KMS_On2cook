import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  FileText,
  Database
} from 'lucide-react';
import { RECIPE_REPOSITORY_CSV_URL } from '../utils/constants';
import { transformRecipeCsvData } from '../utils/csvTransformers';

export function RecipeGoogleSheetsTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [transformedRecipes, setTransformedRecipes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetchTime, setFetchTime] = useState<string | null>(null);

  const handleTestFetch = async () => {
    setIsLoading(true);
    setError(null);
    setCsvData(null);
    setTransformedRecipes([]);

    try {
      console.log('🧪 RECIPE TEST - Starting fetch from:', RECIPE_REPOSITORY_CSV_URL);
      
      const response = await fetch(RECIPE_REPOSITORY_CSV_URL, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv,text/plain,application/csv,*/*',
          'User-Agent': 'On2Cook-RecipeTest/1.0'
        },
        mode: 'cors',
        credentials: 'omit',
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: HTTP ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();
      console.log('🧪 RECIPE TEST - CSV data received, length:', csvText.length);
      
      if (!csvText || csvText.length < 10) {
        throw new Error('CSV data is empty or too short');
      }

      setCsvData(csvText);
      setFetchTime(new Date().toLocaleString());

      // Parse CSV data
      const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalizedText.split('\n').filter(line => line.trim().length > 0);
      
      const parsedData = lines.map(line => {
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

      console.log('🧪 RECIPE TEST - CSV parsed, rows:', parsedData.length);
      
      // Transform data
      const recipes = transformRecipeCsvData(parsedData);
      setTransformedRecipes(recipes);
      
      console.log('🧪 RECIPE TEST - Transformation complete:', recipes.length);

    } catch (err) {
      console.error('🧪 RECIPE TEST - Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Recipe Google Sheets Import Test
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Test the connection and data parsing from the Google Sheets recipe repository
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">Google Sheets Source URL</div>
                <div className="text-xs font-mono bg-muted p-2 rounded break-all">
                  {RECIPE_REPOSITORY_CSV_URL}
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-2">
            <Button 
              onClick={handleTestFetch}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Test Google Sheets Import
                </>
              )}
            </Button>
            
            {fetchTime && (
              <span className="text-sm text-muted-foreground">
                Last tested: {fetchTime}
              </span>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <div className="font-medium text-red-700">Connection Error</div>
                <div className="text-sm">{error}</div>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {csvData && !error && (
            <Alert className="border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium text-green-700">Connection Successful</div>
                  <div className="text-sm">
                    CSV Data Size: {csvData.length.toLocaleString()} characters
                  </div>
                  <div className="text-sm">
                    Transformed Recipes: {transformedRecipes.length}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Recipe Preview */}
          {transformedRecipes.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Recipe Preview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-auto">
                {transformedRecipes.slice(0, 12).map((recipe, index) => (
                  <Card key={index} className="overflow-hidden">
                    <div className="aspect-video relative bg-gray-100">
                      <img
                        src={recipe.imageLink || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&auto=format&q=80'}
                        alt={recipe.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&auto=format&q=80';
                        }}
                      />
                    </div>
                    <CardContent className="p-3">
                      <h4 className="font-medium text-sm truncate">{recipe.name}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {recipe.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {recipe.cuisine}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {recipe.difficulty} • {recipe.preparationTime + recipe.cookingTime}min
                      </div>
                      {recipe.jsonLink && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          <FileText className="h-2 w-2 mr-1" />
                          Has JSON
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {transformedRecipes.length > 12 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing first 12 of {transformedRecipes.length} recipes
                </p>
              )}
            </div>
          )}

          {/* Raw CSV Preview */}
          {csvData && (
            <div>
              <h3 className="font-medium mb-3">Raw CSV Data Preview</h3>
              <div className="bg-muted p-3 rounded text-xs font-mono max-h-32 overflow-auto">
                {csvData.split('\n').slice(0, 10).join('\n')}
                {csvData.split('\n').length > 10 && '\n... (truncated)'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}