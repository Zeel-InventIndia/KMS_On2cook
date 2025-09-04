import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { BackendRecipeSelector } from './BackendRecipeSelector';
import { User } from '../App';
import { ChefHat, TestTube, Trash2 } from 'lucide-react';

interface RecipeRepositoryTestProps {
  user: User;
}

export function RecipeRepositoryTest({ user }: RecipeRepositoryTestProps) {
  const [showSelector, setShowSelector] = useState(false);
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);

  const handleSelectRecipes = (recipes: string[]) => {
    setSelectedRecipes(recipes);
    console.log('✅ Selected recipes:', recipes);
  };

  const clearSelection = () => {
    setSelectedRecipes([]);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Backend Recipe Repository Test
          </CardTitle>
          <p className="text-muted-foreground">
            Test the backend recipe integration for presales team members
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p>Current User: <strong>{user.name}</strong></p>
              <p>Role: <strong>{user.role}</strong></p>
            </div>
            <Button onClick={() => setShowSelector(true)}>
              <ChefHat className="h-4 w-4 mr-2" />
              Open Recipe Selector
            </Button>
          </div>

          {/* Selected Recipes Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Selected Recipes ({selectedRecipes.length})</h3>
              {selectedRecipes.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearSelection}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            
            {selectedRecipes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedRecipes.map((recipe, index) => (
                  <Badge key={index} variant="secondary">
                    {recipe}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No recipes selected yet. Click "Open Recipe Selector" to choose recipes from the backend.
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">How to Test:</h4>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Click "Open Recipe Selector" to open the backend recipe selector modal</li>
              <li>2. The modal will fetch recipes from the backend server</li>
              <li>3. Search and select recipes from the available options</li>
              <li>4. Click "Add Selected Recipes" to confirm your selection</li>
              <li>5. The selected recipes will appear in the "Selected Recipes" section above</li>
            </ol>
          </div>

          {/* Debug Info */}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Debug Information</summary>
            <div className="mt-2 space-y-1 bg-gray-50 p-2 rounded">
              <p>Backend URL: https://{process.env.REACT_APP_SUPABASE_PROJECT_ID || 'your-project'}.supabase.co/functions/v1/make-server-3005c377/recipes</p>
              <p>Selected Recipe Count: {selectedRecipes.length}</p>
              <p>Selected Recipes: {JSON.stringify(selectedRecipes, null, 2)}</p>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Backend Recipe Selector */}
      <BackendRecipeSelector
        user={user}
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        onSelectRecipes={handleSelectRecipes}
        selectedRecipes={selectedRecipes}
      />
    </div>
  );
}