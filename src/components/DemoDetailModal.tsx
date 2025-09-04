import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  ChefHat, 
  Users, 
  FileText, 
  ExternalLink,
  Eye,
  Upload,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Copy
} from 'lucide-react';
import { DemoRequest, User as UserType } from '../App';
import { RecipeRepositoryFromSheets } from './RecipeRepositoryFromSheets';
import { GoogleSheetsUpdater } from './GoogleSheetsUpdater';
import { MediaUploadComponent } from './MediaUploadComponent';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DemoDetailModalProps {
  demo: DemoRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (demo: DemoRequest) => void;
  readOnly?: boolean;
  showMediaSection?: boolean;
  currentUser?: UserType;
}

export function DemoDetailModal({ 
  demo, 
  isOpen, 
  onClose, 
  onUpdate,
  readOnly = false,
  showMediaSection = true,
  currentUser
}: DemoDetailModalProps) {
  const [editedDemo, setEditedDemo] = useState<DemoRequest | null>(demo);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [newRecipeName, setNewRecipeName] = useState('');
  const [recipeAutoSaveStatus, setRecipeAutoSaveStatus] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string>('');

  React.useEffect(() => {
    setEditedDemo(demo);
  }, [demo]);

  if (!demo || !editedDemo) return null;

  // Check if current user can edit recipes - presales team members can edit their assigned demos
  const canEditRecipes = currentUser && (
    currentUser.role === 'presales' && editedDemo.assignee === currentUser.name.toLowerCase()
  ) || currentUser?.role === 'head_chef';

  const handleSave = async () => {
    if (onUpdate) {
      // If this is a presales user saving recipe changes, also save to backend
      if (currentUser?.role === 'presales' && editedDemo) {
        try {
          // Save to backend to sync across all users
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/demo-requests/${editedDemo.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...editedDemo,
              updatedBy: currentUser.name
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Recipe changes saved to backend:', result);
          } else {
            console.error('❌ Failed to save recipe changes to backend:', response.statusText);
          }
        } catch (error) {
          console.error('💥 Error saving recipe changes to backend:', error);
        }
      }
      
      onUpdate(editedDemo);
    }
    onClose();
  };

  const handleAddRecipe = async (recipeName: string) => {
    if (editedDemo && recipeName.trim() && !editedDemo.recipes.includes(recipeName.trim())) {
      // Add recipe to the demo
      setEditedDemo({
        ...editedDemo,
        recipes: [...editedDemo.recipes, recipeName.trim()]
      });

      // Note: Recipes are now managed via Google Sheets - manual additions are just for this demo
      if (currentUser?.role === 'presales') {
        try {
          console.log(`🍳 Auto-saving recipe "${recipeName.trim()}" to backend repository...`);
          setRecipeAutoSaveStatus(`🔄 Saving "${recipeName.trim()}" to repository...`);
          
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/recipes`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name: recipeName.trim(),
              imageLink: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&auto=format', // Default recipe image
              jsonLink: null,
              createdBy: currentUser.name
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`✅ Recipe "${recipeName.trim()}" auto-saved to repository:`, result.data);
            if (result.duplicate) {
              setRecipeAutoSaveStatus(`📚 "${recipeName.trim()}" was already in repository`);
            } else {
              setRecipeAutoSaveStatus(`✅ "${recipeName.trim()}" saved to repository`);
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            // Don't show error if recipe already exists (409) - that's expected
            if (response.status !== 409) {
              console.warn(`⚠️ Failed to auto-save recipe "${recipeName.trim()}" to repository:`, errorData.error);
              setRecipeAutoSaveStatus(`⚠️ Failed to save "${recipeName.trim()}" to repository`);
            } else {
              console.log(`📚 Recipe "${recipeName.trim()}" already exists in repository`);
              setRecipeAutoSaveStatus(`📚 "${recipeName.trim()}" was already in repository`);
            }
          }
          
          // Clear status after 3 seconds
          setTimeout(() => setRecipeAutoSaveStatus(''), 3000);
        } catch (error) {
          console.warn(`⚠️ Error auto-saving recipe "${recipeName.trim()}" to repository:`, error);
          setRecipeAutoSaveStatus(`⚠️ Error saving "${recipeName.trim()}" to repository`);
          setTimeout(() => setRecipeAutoSaveStatus(''), 3000);
          // Don't block the UI - recipe is still added to demo even if backend save fails
        }
      }
    }
  };

  const handleRemoveRecipe = (index: number) => {
    if (editedDemo) {
      const updatedRecipes = [...editedDemo.recipes];
      updatedRecipes.splice(index, 1);
      setEditedDemo({
        ...editedDemo,
        recipes: updatedRecipes
      });
    }
  };

  const handleAddNewRecipe = () => {
    if (newRecipeName.trim()) {
      handleAddRecipe(newRecipeName.trim());
      setNewRecipeName('');
    }
  };

  const handleSelectRecipeFromRepository = (selectedRecipe: any) => {
    if (editedDemo && selectedRecipe && selectedRecipe.name) {
      // Add recipe if not already in the list
      const existingRecipes = editedDemo.recipes;
      const recipeName = selectedRecipe.name;
      
      if (!existingRecipes.includes(recipeName)) {
        setEditedDemo({
          ...editedDemo,
          recipes: [...existingRecipes, recipeName]
        });
      }
    }
    setShowRecipeSelector(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'demo_planned': return 'bg-green-100 text-green-800 border-green-200';
      case 'demo_rescheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'demo_cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'demo_given': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getTeamName = (teamId?: number) => {
    if (!teamId) return 'Not assigned';
    return `Team ${teamId}`;
  };

  const handleMediaUploadComplete = (mediaLink: string) => {
    if (editedDemo) {
      const updatedDemo = {
        ...editedDemo,
        mediaLink,
        mediaUploaded: true,
        dropboxLink: mediaLink
      };
      setEditedDemo(updatedDemo);
      if (onUpdate) {
        onUpdate(updatedDemo);
      }
    }
    setShowUploadModal(false);
  };

  const handleCopyDemoDetails = async () => {
    if (!editedDemo) return;

    const formatDemoDetails = () => {
      const demoType = "Virtual Demo"; // You can customize this based on demo type if needed
      const formattedDate = formatDate(editedDemo.demoDate);
      const time = editedDemo.demoTime || 'Time not specified';
      const clientName = editedDemo.clientName || 'Name not provided';
      const phone = editedDemo.clientMobile || 'Number not provided';
      const restaurantName = editedDemo.restaurantName || editedDemo.clientName || 'Restaurant name not provided';
      const location = editedDemo.location || editedDemo.clientLocation || 'Location not provided';
      const recipes = editedDemo.recipes && editedDemo.recipes.length > 0 
        ? editedDemo.recipes.join(', ') 
        : 'Menu not specified';
      const scheduledBy = currentUser?.name || 'Not specified';
      const assignedTo = editedDemo.salesRep || 'Not assigned';

      return `${demoType}
Date: ${formattedDate}
Time: ${time}

Name: ${clientName}
Number: ${phone}
Restaurant's name: ${restaurantName}
Location: ${location}
Demo Menu: ${recipes}

Scheduled by: ${scheduledBy}
Assigned to: ${assignedTo}`;
    };

    const demoDetailsText = formatDemoDetails();

    // Method 1: Try modern clipboard API with verification
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(demoDetailsText);
        
        // Verify the copy worked by reading back from clipboard
        try {
          const clipboardContent = await navigator.clipboard.readText();
          if (clipboardContent === demoDetailsText) {
            setCopyStatus('✅ Demo details copied to clipboard!');
            setTimeout(() => setCopyStatus(''), 3000);
            return;
          } else {
            console.warn('Clipboard verification failed - content mismatch');
          }
        } catch (readError) {
          // If we can't verify, assume it worked if writeText didn't throw
          console.warn('Cannot verify clipboard content, assuming success:', readError);
          setCopyStatus('✅ Demo details copied to clipboard!');
          setTimeout(() => setCopyStatus(''), 3000);
          return;
        }
      } catch (error) {
        console.warn('Modern clipboard API failed:', error);
      }
    }

    // Method 2: Try legacy execCommand method with improved verification
    try {
      // Create a more accessible textarea for better browser compatibility
      const textArea = document.createElement('textarea');
      textArea.value = demoDetailsText;
      
      // Style the textarea to be invisible but still accessible
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0';
      
      document.body.appendChild(textArea);
      
      // Focus and select the text
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, 99999); // For mobile devices
      
      // Try to copy
      const successful = document.execCommand('copy');
      
      // Clean up
      document.body.removeChild(textArea);
      
      if (successful) {
        // Give a small delay to ensure the copy operation completed
        setTimeout(() => {
          setCopyStatus('✅ Demo details copied to clipboard!');
          setTimeout(() => setCopyStatus(''), 3000);
        }, 100);
        return;
      } else {
        console.warn('execCommand returned false');
      }
    } catch (error) {
      console.warn('Legacy copy method failed:', error);
    }

    // Method 3: Force manual copy fallback
    console.log('All automatic copy methods failed, showing manual copy');
    setCopyStatus(`📋 Please copy this text manually:

${demoDetailsText}`);
    
    // Clear status after 15 seconds for manual copy
    setTimeout(() => setCopyStatus(''), 15000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Demo Details - {demo.clientName}
              </DialogTitle>
              <DialogDescription>
                {readOnly ? 'View demo request details' : 'View and edit demo request details'}
              </DialogDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCopyDemoDetails}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Details
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          
          {/* Status and Key Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <Badge className={`${getStatusColor(editedDemo.leadStatus)} mb-2`}>
                {editedDemo.leadStatus === 'demo_given' ? 'Demo Given ✓' : editedDemo.leadStatus.replace('_', ' ')}
              </Badge>
              <div className="text-sm text-muted-foreground">Current Status</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{formatDate(editedDemo.demoDate)}</div>
              <div className="text-sm text-muted-foreground">Demo Date</div>
            </div>
            <div className="text-center">
              <div className="font-medium">{editedDemo.demoTime || 'Not specified'}</div>
              <div className="text-sm text-muted-foreground">Demo Time</div>
            </div>
          </div>

          {/* Client Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <User className="h-5 w-5" />
              Client Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client Name</label>
                {readOnly ? (
                  <div className="p-2 bg-muted rounded">{editedDemo.clientName}</div>
                ) : (
                  <Input 
                    value={editedDemo.clientName}
                    onChange={(e) => setEditedDemo({...editedDemo, clientName: e.target.value})}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone Number
                </label>
                {readOnly ? (
                  <div className="p-2 bg-muted rounded">{editedDemo.clientMobile || 'Not provided'}</div>
                ) : (
                  <Input 
                    value={editedDemo.clientMobile}
                    onChange={(e) => setEditedDemo({...editedDemo, clientMobile: e.target.value})}
                  />
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email Address
                </label>
                {readOnly ? (
                  <div className="p-2 bg-muted rounded">{editedDemo.clientEmail || 'Not provided'}</div>
                ) : (
                  <Input 
                    value={editedDemo.clientEmail}
                    onChange={(e) => setEditedDemo({...editedDemo, clientEmail: e.target.value})}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Demo Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Demo Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Demo Date</label>
                {readOnly ? (
                  <div className="p-2 bg-muted rounded">{formatDate(editedDemo.demoDate)}</div>
                ) : (
                  <Input 
                    type="date"
                    value={editedDemo.demoDate}
                    onChange={(e) => setEditedDemo({...editedDemo, demoDate: e.target.value})}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Demo Time
                </label>
                {readOnly ? (
                  <div className="p-2 bg-muted rounded">{editedDemo.demoTime || 'Not specified'}</div>
                ) : (
                  <Input 
                    value={editedDemo.demoTime || ''}
                    onChange={(e) => setEditedDemo({...editedDemo, demoTime: e.target.value})}
                    placeholder="e.g., 10:00 AM"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assigned To (Presales)</label>
                <div className="p-2 bg-muted rounded">{editedDemo.assignee || 'Not assigned'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sales Representative</label>
                <div className="p-2 bg-muted rounded">{editedDemo.salesRep || 'Not assigned'}</div>
              </div>
              {!readOnly && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <Select 
                    value={editedDemo.leadStatus} 
                    onValueChange={(value: any) => setEditedDemo({...editedDemo, leadStatus: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="demo_planned">Demo Planned</SelectItem>
                      <SelectItem value="demo_rescheduled">Demo Rescheduled</SelectItem>
                      <SelectItem value="demo_cancelled">Demo Cancelled</SelectItem>
                      <SelectItem value="demo_given">Demo Given</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Kitchen Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Users className="h-5 w-5" />
              Kitchen Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Assigned Team</label>
                <div className="p-2 bg-muted rounded">{getTeamName(editedDemo.assignedTeam)}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time Slot</label>
                <div className="p-2 bg-muted rounded">{editedDemo.assignedSlot || 'Not assigned'}</div>
              </div>
            </div>
          </div>

          {/* Recipes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  Recipes ({editedDemo.recipes.length})
                </h3>
                {canEditRecipes && !readOnly && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                    ✏️ Can Edit
                  </Badge>
                )}
              </div>
              {canEditRecipes && !readOnly && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRecipeSelector(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    From Repository
                  </Button>
                </div>
              )}
            </div>
            
            {/* Add Recipe Manually */}
            {canEditRecipes && !readOnly && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Input
                    placeholder="Add recipe name manually..."
                    value={newRecipeName}
                    onChange={(e) => setNewRecipeName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddNewRecipe();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddNewRecipe}
                    disabled={!newRecipeName.trim()}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                
                {/* Auto-save status notification */}
                {recipeAutoSaveStatus && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                    {recipeAutoSaveStatus}
                  </div>
                )}
                
                {currentUser?.role === 'presales' && (
                  <div className="text-xs text-muted-foreground">
                    💡 Manually added recipes are automatically saved to the repository for reuse
                  </div>
                )}
              </div>
            )}
            
            {editedDemo.recipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {editedDemo.recipes.map((recipe, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="secondary" className="justify-start p-2 flex-1">
                      {recipe}
                    </Badge>
                    {canEditRecipes && !readOnly && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveRecipe(index)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <ChefHat className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recipes assigned</p>
                {canEditRecipes && !readOnly && (
                  <p className="text-sm mt-2">Use the buttons above to add recipes to this demo.</p>
                )}
                {!canEditRecipes && currentUser?.role === 'presales' && (
                  <p className="text-sm mt-2 text-amber-600">
                    You can only edit recipes for demos assigned to you.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </h3>
            {readOnly ? (
              <div className="p-3 bg-muted rounded min-h-[60px]">
                {editedDemo.notes || 'No notes available'}
              </div>
            ) : (
              <Input 
                value={editedDemo.notes || ''}
                onChange={(e) => setEditedDemo({...editedDemo, notes: e.target.value})}
                placeholder="Add notes about this demo..."
              />
            )}
          </div>

          {/* Media Section - Only show for demo_given status */}
          {showMediaSection && editedDemo.leadStatus === 'demo_given' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Media & Documentation
                </h3>
                {!editedDemo.mediaUploaded && currentUser && (
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Media
                  </Button>
                )}
              </div>
              <div className="p-4 border rounded-lg bg-blue-50">
                <div className="space-y-3">
                  {editedDemo.mediaUploaded ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Media uploaded successfully</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Media upload pending</span>
                    </div>
                  )}
                  
                  {editedDemo.mediaLink && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Media Link</label>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={editedDemo.mediaLink} 
                          readOnly 
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => window.open(editedDemo.mediaLink, '_blank')}
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {editedDemo.dropboxLink && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Dropbox Folder</label>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={editedDemo.dropboxLink} 
                          readOnly 
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => window.open(editedDemo.dropboxLink, '_blank')}
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {!editedDemo.mediaLink && !editedDemo.dropboxLink && !editedDemo.mediaUploaded && (
                    <div className="text-sm text-muted-foreground">
                      No media uploaded yet. Click "Upload Media" to add photos and videos from the demo.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Google Sheets Update Section - Only show for presales team members and Vijay */}
          {currentUser && (currentUser.role === 'presales' || currentUser.role === 'vijay' || currentUser.role === 'head_chef') && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Update Google Sheets
              </h3>
              <div className="p-4 border rounded-lg bg-green-50">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Sync to Master Spreadsheet</div>
                    <div className="text-xs text-muted-foreground">
                      {currentUser.role === 'vijay' 
                        ? 'Update recipes, notes, and media links for this demo'
                        : 'Update recipes and notes for this demo (Media links added by Vijay after completion)'
                      }
                    </div>
                  </div>
                  <GoogleSheetsUpdater 
                    demoRequest={editedDemo}
                    userRole={currentUser.role}
                    showMediaInput={currentUser.role === 'vijay' && editedDemo.leadStatus === 'demo_given'}
                    onUpdated={() => {
                      console.log('✅ Google Sheets updated successfully');
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Copy Status Notification */}
          {copyStatus && (
            <div className={`text-sm p-3 rounded border ${
              copyStatus.includes('✅') 
                ? 'bg-green-50 text-green-700 border-green-200'
                : copyStatus.includes('❌')
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
                {copyStatus}
              </div>
              {copyStatus.includes('📋') && (
                <div className="mt-2">
                  <div className="text-xs text-blue-600 mb-2">
                    Select all the text above and copy it manually (Ctrl+C or Cmd+C)
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      // Select the text in the status div
                      const statusDiv = document.querySelector('[style*="pre-wrap"]');
                      if (statusDiv) {
                        const range = document.createRange();
                        range.selectNodeContents(statusDiv);
                        const selection = window.getSelection();
                        selection?.removeAllRanges();
                        selection?.addRange(range);
                      }
                    }}
                  >
                    Select Text
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleCopyDemoDetails}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Details
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                {readOnly ? 'Close' : 'Cancel'}
              </Button>
              {!readOnly && onUpdate && (
                <Button onClick={handleSave}>
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
      
      {/* Recipe Selector from Google Sheets */}
      {currentUser && showRecipeSelector && (
        <Dialog open={showRecipeSelector} onOpenChange={setShowRecipeSelector}>
          <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Recipe from Repository</DialogTitle>
              <DialogDescription>
                Choose a recipe from the repository to add to this demo. Click on any recipe to select it.
              </DialogDescription>
            </DialogHeader>
            <RecipeRepositoryFromSheets 
              user={currentUser}
              onSelectRecipe={handleSelectRecipeFromRepository}
              selectionMode={true}
              onClose={() => setShowRecipeSelector(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Media Upload Modal */}
      {showUploadModal && editedDemo && (
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto">
            <MediaUploadComponent
              demoRequest={editedDemo}
              onUploadComplete={handleMediaUploadComplete}
              onClose={() => setShowUploadModal(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}