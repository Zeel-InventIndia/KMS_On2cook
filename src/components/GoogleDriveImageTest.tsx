import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  convertGoogleDriveUrl, 
  getSmartGoogleDriveUrlVariants, 
  testGoogleDriveUrl,
  getRecipeImageUrl,
  RECIPE_IMAGE_MAPPING 
} from '../utils/recipeImageMapping';

export function GoogleDriveImageTest() {
  const [testUrl, setTestUrl] = useState("https://drive.google.com/file/d/1iLXj5IPg9wICHJl9MSWU4A2mYcs7dnp8/view?usp=drive_link");
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [testResults, setTestResults] = useState<Array<{url: string, status: 'loading' | 'success' | 'error', error?: string}>>([]);
  const [selectedRecipe, setSelectedRecipe] = useState('ALOO GOBI');

  const alternativeUrls = getSmartGoogleDriveUrlVariants(testUrl);
  const recipeNames = Object.keys(RECIPE_IMAGE_MAPPING).slice(0, 10); // Show first 10 recipes

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set([...prev, index]));
  };

  const handleImageLoad = (index: number) => {
    setImageErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const testAllUrls = async () => {
    console.log('🧪 Starting comprehensive URL test...');
    const initialResults = alternativeUrls.map(url => ({ url, status: 'loading' as const }));
    setTestResults(initialResults);
    
    const results = await Promise.allSettled(
      alternativeUrls.map(async (url) => {
        const result = await testGoogleDriveUrl(url, 5000);
        return {
          url,
          status: result.success ? 'success' as const : 'error' as const,
          error: result.error
        };
      })
    );
    
    const finalResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: alternativeUrls[index],
          status: 'error' as const,
          error: 'Test failed'
        };
      }
    });
    
    setTestResults(finalResults);
    console.log('🧪 URL test completed:', finalResults);
  };

  const loadRecipeUrl = () => {
    const recipeUrl = getRecipeImageUrl(selectedRecipe);
    if (recipeUrl) {
      setTestUrl(recipeUrl);
      setImageErrors(new Set());
      setTestResults([]);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Google Drive Image URL Tester</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Test URL:</label>
              <Input
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="Paste Google Drive URL here"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Or select a recipe:</label>
              <div className="flex gap-2">
                <select 
                  value={selectedRecipe} 
                  onChange={(e) => setSelectedRecipe(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                >
                  {recipeNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <Button onClick={loadRecipeUrl} variant="outline" size="sm">
                  Load
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={testAllUrls} variant="outline">
              🧪 Test All URLs
            </Button>
            <Button onClick={() => { setImageErrors(new Set()); setTestResults([]); }} variant="outline">
              🔄 Reset
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">URL Analysis</h3>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div><strong>Is Google Drive URL:</strong> {testUrl.includes('drive.google.com') ? 'Yes' : 'No'}</div>
              <div><strong>Converted URL:</strong> {convertGoogleDriveUrl(testUrl)}</div>
              <div><strong>Total Variants:</strong> {alternativeUrls.length}</div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Alternative URL Formats</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alternativeUrls.map((url, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-gray-600">
                      Format {index + 1}: {index === 0 ? 'Direct View' : index === 1 ? 'Alternative Direct' : index === 2 ? 'Thumbnail' : 'Original'}
                    </div>
                    <div className="text-xs break-all text-gray-500 mb-2">
                      {url}
                    </div>
                    
                    {imageErrors.has(index) ? (
                      <div className="w-full h-32 bg-red-100 border-2 border-red-300 rounded flex items-center justify-center">
                        <div className="text-center text-red-600">
                          <div className="text-sm font-medium">❌ Failed to Load</div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="mt-2 text-xs"
                            onClick={() => {
                              setImageErrors(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(index);
                                return newSet;
                              });
                            }}
                          >
                            Retry
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={url}
                        alt={`Test format ${index + 1}`}
                        className="w-full h-32 object-cover rounded border"
                        onError={() => handleImageError(index)}
                        onLoad={() => handleImageLoad(index)}
                      />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-medium">Test Results Summary</h3>
            <div className="text-sm">
              {alternativeUrls.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${imageErrors.has(index) ? 'bg-red-500' : 'bg-green-500'}`}></span>
                  <span>Format {index + 1}: {imageErrors.has(index) ? 'Failed' : 'Working'}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}