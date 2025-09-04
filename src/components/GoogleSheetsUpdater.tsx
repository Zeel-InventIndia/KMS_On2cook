import React, { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { CheckCircle, AlertTriangle, ExternalLink, Upload } from 'lucide-react';
import { DemoRequest } from '../App';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { GoogleSheetsTestConnection } from './GoogleSheetsTestConnection';

interface GoogleSheetsUpdaterProps {
  demoRequest: DemoRequest;
  onUpdated?: () => void;
  userRole?: string;
  showMediaInput?: boolean;
}

export function GoogleSheetsUpdater({ demoRequest, onUpdated, userRole, showMediaInput = false }: GoogleSheetsUpdaterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaLink, setMediaLink] = useState(demoRequest.mediaLink || '');
  const [notes, setNotes] = useState(demoRequest.notes || '');
  const [updateResult, setUpdateResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleUpdateSheet = async () => {
    setIsLoading(true);
    setUpdateResult(null);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/demo-requests/${demoRequest.id}/sheets`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientName: demoRequest.clientName,
          clientEmail: demoRequest.clientEmail,
          recipes: demoRequest.recipes,
          notes: notes.trim(),
          mediaLink: (showMediaInput || userRole === 'vijay') ? mediaLink.trim() : demoRequest.mediaLink || '',
          updatedBy: userRole === 'vijay' ? 'Vijay (Media Upload)' : 'System Update'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Failed to update Google Sheets');
      }

      setUpdateResult({
        success: true,
        message: 'Successfully updated Google Sheets with recipes and media link!'
      });

      // Call the onUpdated callback if provided
      if (onUpdated) {
        onUpdated();
      }

      console.log('✅ Google Sheets updated successfully:', result);
    } catch (error) {
      console.error('❌ Error updating Google Sheets:', error);
      setUpdateResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update Google Sheets'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Update Sheet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Update Google Sheets
          </DialogTitle>
          <DialogDescription>
            Update the Google Sheets with recipes, media link, and notes for {demoRequest.clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Demo Request Info */}
          <div className="bg-muted p-3 rounded-md">
            <h4 className="font-medium mb-2">Demo Request Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Client:</span> {demoRequest.clientName}
              </div>
              <div>
                <span className="font-medium">Email:</span> {demoRequest.clientEmail}
              </div>
              <div>
                <span className="font-medium">Phone:</span> {demoRequest.clientMobile}
              </div>
              <div>
                <span className="font-medium">Status:</span> 
                <Badge variant="outline" className="ml-1">
                  {demoRequest.leadStatus.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Current Recipes */}
          <div>
            <Label>Recipes to Update in Sheet</Label>
            <div className="mt-2">
              {demoRequest.recipes && demoRequest.recipes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {demoRequest.recipes.map((recipe, index) => (
                    <Badge key={index} variant="secondary">
                      {recipe}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  No recipes assigned to this demo request
                </div>
              )}
            </div>
          </div>

          {/* Media Link - Only show for Vijay or when explicitly requested */}
          {(showMediaInput || userRole === 'vijay') && (
            <div>
              <Label htmlFor="mediaLink">Media Link</Label>
              <Input
                id="mediaLink"
                value={mediaLink}
                onChange={(e) => setMediaLink(e.target.value)}
                placeholder="https://dropbox.com/s/xyz/demo-media"
                className="mt-1"
              />
              <div className="text-sm text-muted-foreground mt-1">
                Link to demo photos, videos, or other media files (Added by Vijay after demo completion)
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about the demo..."
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Update Result */}
          {updateResult && (
            <Alert variant={updateResult.success ? "default" : "destructive"}>
              {updateResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>{updateResult.message}</AlertDescription>
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
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateSheet}
                disabled={isLoading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isLoading ? 'Updating...' : 'Update Google Sheets'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}