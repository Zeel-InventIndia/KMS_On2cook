import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { CheckCircle, AlertTriangle, Upload, FileSpreadsheet } from 'lucide-react';
import { DemoRequest } from '../App';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { GoogleSheetsTestConnection } from './GoogleSheetsTestConnection';

interface BulkGoogleSheetsUpdaterProps {
  demoRequests: DemoRequest[];
  onUpdated?: () => void;
}

export function BulkGoogleSheetsUpdater({ demoRequests, onUpdated }: BulkGoogleSheetsUpdaterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Array<{ demo: DemoRequest; success: boolean; message: string }>>([]);
  const [currentDemo, setCurrentDemo] = useState<string>('');

  // Filter to only demo requests that have recipes or media links
  const updatableDemos = demoRequests.filter(demo => 
    (demo.recipes && demo.recipes.length > 0) || 
    demo.mediaLink || 
    demo.notes
  );

  const handleBulkUpdate = async () => {
    setIsLoading(true);
    setProgress(0);
    setResults([]);
    
    const updateResults: Array<{ demo: DemoRequest; success: boolean; message: string }> = [];

    for (let i = 0; i < updatableDemos.length; i++) {
      const demo = updatableDemos[i];
      setCurrentDemo(demo.clientName);
      setProgress(((i + 1) / updatableDemos.length) * 100);

      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/demo-requests/${demo.id}/sheets`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clientName: demo.clientName,
            clientEmail: demo.clientEmail,
            recipes: demo.recipes,
            notes: demo.notes,
            mediaLink: demo.mediaLink,
            updatedBy: 'Bulk Update'
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.details || result.error || 'Failed to update Google Sheets');
        }

        updateResults.push({
          demo,
          success: true,
          message: 'Successfully updated'
        });

        console.log(`✅ Updated ${demo.clientName} in Google Sheets`);
      } catch (error) {
        console.error(`❌ Error updating ${demo.clientName}:`, error);
        updateResults.push({
          demo,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setResults(updateResults);
    setIsLoading(false);
    setCurrentDemo('');

    // Call the onUpdated callback if provided
    if (onUpdated) {
      onUpdated();
    }

    console.log(`📊 Bulk update complete: ${updateResults.filter(r => r.success).length} successful, ${updateResults.filter(r => !r.success).length} failed`);
  };

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Bulk Update Sheets ({updatableDemos.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Update Google Sheets
          </DialogTitle>
          <DialogDescription>
            Update multiple demo requests in Google Sheets at once. Only demos with recipes, notes, or media links will be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-muted p-3 rounded-md">
            <h4 className="font-medium mb-2">Update Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Total demos:</span> {demoRequests.length}
              </div>
              <div>
                <span className="font-medium">Updatable demos:</span> {updatableDemos.length}
              </div>
              <div>
                <span className="font-medium">With recipes:</span> {updatableDemos.filter(d => d.recipes?.length > 0).length}
              </div>
              <div>
                <span className="font-medium">With media links:</span> {updatableDemos.filter(d => d.mediaLink).length}
              </div>
            </div>
          </div>

          {/* Progress */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Updating: {currentDemo}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                {successCount > 0 && (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">{successCount} successful</span>
                  </div>
                )}
                {failureCount > 0 && (
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">{failureCount} failed</span>
                  </div>
                )}
              </div>

              <div className="max-h-40 overflow-y-auto space-y-2">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">{result.demo.clientName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {result.success ? 'Updated' : result.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          {!isLoading && results.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This will update {updatableDemos.length} demo requests in Google Sheets with their current recipes, notes, and media links. This action cannot be undone.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <GoogleSheetsTestConnection />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
              >
                {results.length > 0 ? 'Close' : 'Cancel'}
              </Button>
              {results.length === 0 && (
                <Button 
                  onClick={handleBulkUpdate}
                  disabled={isLoading || updatableDemos.length === 0}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {isLoading ? 'Updating...' : `Update ${updatableDemos.length} Demos`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}