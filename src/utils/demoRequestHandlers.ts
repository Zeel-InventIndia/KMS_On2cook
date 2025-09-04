import { DemoRequest } from '../types/DemoRequest';
import { User } from '../types/User';
import { projectId, publicAnonKey } from './supabase/info';

export const handleUpdateDemoRequest = async (
  updatedRequest: DemoRequest,
  currentUser: User | null,
  setDemoRequests: (updater: (prev: DemoRequest[]) => DemoRequest[]) => void
) => {
  // Save to backend for presales team updating recipes OR head chef updating team assignments
  const shouldSaveToBackend = (
    currentUser?.role === 'presales' || 
    (currentUser?.role === 'head_chef' && (updatedRequest.assignedTeam || updatedRequest.assignedSlot || updatedRequest.assignedMember || updatedRequest.assignedMembers))
  );

  if (shouldSaveToBackend) {
    try {
      console.log('💾 Saving demo request to backend:', {
        id: updatedRequest.id,
        clientName: updatedRequest.clientName,
        clientEmail: updatedRequest.clientEmail,
        recipesCount: updatedRequest.recipes?.length || 0,
        assignedTeam: updatedRequest.assignedTeam,
        assignedSlot: updatedRequest.assignedSlot,
        assignedMember: updatedRequest.assignedMember,
        assignedMembers: updatedRequest.assignedMembers,
        totalMembers: Array.isArray(updatedRequest.assignedMembers) ? updatedRequest.assignedMembers.length : 0,
        membersToSheet: Array.isArray(updatedRequest.assignedMembers) ? updatedRequest.assignedMembers.join(', ') : 'None',
        updatedBy: currentUser.name,
        role: currentUser.role
      });
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/demo-requests/${updatedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...updatedRequest,
          updatedBy: currentUser.name
        }),
        signal: AbortSignal.timeout(8000)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Demo request saved to backend successfully:', result);
        
        if (currentUser?.role === 'presales') {
          console.log('🎉 Recipes saved to backend! They will be preserved during CSV updates.');
        } else if (currentUser?.role === 'head_chef') {
          console.log('🎉 Team assignment saved to Google Sheets successfully!');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to save to backend:', response.status, response.statusText, errorText);
      }
    } catch (error) {
      console.error('💥 Error saving to backend:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('💥 Backend save timeout - request took too long');
      }
    }
  }
  
  setDemoRequests(prev => 
    prev.map(req => {
      if (req.id === updatedRequest.id) {
        // Track status changes
        const statusChanged = req.leadStatus !== updatedRequest.leadStatus;
        
        let finalRequest = {
          ...updatedRequest,
          previousStatus: statusChanged ? req.leadStatus : req.previousStatus,
          statusChangedAt: statusChanged ? new Date().toISOString() : req.statusChangedAt,
          statusChangedBy: statusChanged ? currentUser?.name : req.statusChangedBy
        };

        // If demo was rescheduled or cancelled, clear assignment to show in unassigned
        if (updatedRequest.leadStatus === 'demo_rescheduled' || updatedRequest.leadStatus === 'demo_cancelled') {
          finalRequest.assignedTeam = undefined;
          finalRequest.assignedSlot = undefined;
        }

        return finalRequest;
      }
      return req;
    })
  );
};

export const handleAddDemoRequest = (
  newRequest: DemoRequest,
  currentUser: User | null,
  setDemoRequests: (updater: (prev: DemoRequest[]) => DemoRequest[]) => void
) => {
  setDemoRequests(prev => [...prev, {
    ...newRequest,
    statusChangedAt: new Date().toISOString(),
    statusChangedBy: currentUser?.name
  }]);
};

// Test function to verify recipe persistence with backend merge
export const handleTestRecipePersistence = async (
  demoRequest: DemoRequest, 
  currentUser: User | null,
  handleUpdateDemoRequest: (updatedRequest: DemoRequest) => Promise<void>,
  fetchCsvData: (showLoading: boolean) => Promise<void>
) => {
  if (!currentUser) return;
  
  console.log('🧪 Testing recipe persistence with backend merge for:', demoRequest.clientName);
  
  // Add a test recipe
  const testRecipes = [...(demoRequest.recipes || []), `Test Recipe ${Date.now()}`];
  const updatedRequest = { ...demoRequest, recipes: testRecipes };
  
  // Save to backend
  await handleUpdateDemoRequest(updatedRequest);
  
  // Wait a moment for backend to update
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Force refresh to test persistence
  console.log('🔄 Force refreshing to test backend persistence...');
  await fetchCsvData(true);
  
  console.log('✅ Backend recipe persistence test completed');
};