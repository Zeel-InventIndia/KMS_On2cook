import { DemoRequest } from '../types/DemoRequest';
import { Task } from '../types/Task';
import { User } from '../types/User';

/**
 * Restores schedule information from Google Sheets data
 */
const restoreScheduleFromSheets = (demoRequest: DemoRequest): DemoRequest => {
  try {
    // Check if this demo has schedule information from Column I
    if (demoRequest.assignedMembers && Array.isArray(demoRequest.assignedMembers) && demoRequest.assignedMembers.length > 0) {
      console.log(`🔄 SCHEDULE RESTORE: Processing ${demoRequest.clientName} with assigned members:`, demoRequest.assignedMembers);
      
      // Determine team number from assigned members
      let teamNumber: number | undefined;
      let timeSlot: string | undefined;
      let gridRow: number | undefined;
      let gridCol: number | undefined;
      
      // Extract time slot if it's stored in scheduledTimeSlot
      if ((demoRequest as any).scheduledTimeSlot) {
        timeSlot = (demoRequest as any).scheduledTimeSlot;
        console.log(`⏰ Found scheduled time slot for ${demoRequest.clientName}:`, timeSlot);
      }
      
      // Define team groups locally to match the updated 5-team structure
      const TEAM_GROUPS = {
        1: ['Manish', 'Pran Krishna'],
        2: ['Shahid', 'Kishore'], 
        3: ['Vikas', 'Krishna'],
        4: ['Bikram', 'Ganesh'],
        5: ['Prathimesh', 'Rajesh', 'Suresh']
      };
      
      // Find team number based on assigned members with safe array operations (updated for 5 teams)
      for (let teamNum = 1; teamNum <= 5; teamNum++) {
        try {
          const teamMembers = TEAM_GROUPS[teamNum as keyof typeof TEAM_GROUPS];
          if (!Array.isArray(teamMembers)) continue;
          
          const hasTeamMember = demoRequest.assignedMembers.some(member => {
            if (!member || typeof member !== 'string') return false;
            
            return teamMembers.some(teamMember => {
              if (!teamMember || typeof teamMember !== 'string') return false;
              
              return teamMember.toLowerCase().includes(member.toLowerCase()) ||
                     member.toLowerCase().includes(teamMember.toLowerCase());
            });
          });
          
          if (hasTeamMember) {
            teamNumber = teamNum;
            console.log(`📍 SCHEDULE RESTORE: Determined team ${teamNum} for ${demoRequest.clientName} based on members:`, demoRequest.assignedMembers);
            break;
          }
        } catch (teamError) {
          console.warn(`⚠️ Error processing team ${teamNum}:`, teamError);
          continue;
        }
      }
      
      // Define time slots locally
      const TIME_SLOTS = [
        '9:00 AM - 11:00 AM',
        '11:00 AM - 1:00 PM', 
        '1:00 PM - 3:00 PM',
        '3:00 PM - 5:00 PM',
        '5:00 PM - 7:00 PM'
      ];
      
      if (timeSlot && teamNumber) {
        try {
          // Find the time slot index
          const timeSlotIndex = TIME_SLOTS.findIndex(slot => {
            if (!slot || typeof slot !== 'string' || !timeSlot || typeof timeSlot !== 'string') return false;
            
            return slot.toLowerCase() === timeSlot.toLowerCase() ||
                   slot.includes(timeSlot) ||
                   timeSlot.includes(slot);
          });
          
          if (timeSlotIndex !== -1) {
            gridRow = timeSlotIndex;
            gridCol = teamNumber - 1; // Teams are 1-indexed, grid is 0-indexed
            console.log(`📍 SCHEDULE RESTORE: Calculated grid position for ${demoRequest.clientName}: row ${gridRow}, col ${gridCol} (team ${teamNumber}, slot ${timeSlot})`);
          }
        } catch (gridError) {
          console.warn(`⚠️ Error calculating grid position for ${demoRequest.clientName}:`, gridError);
        }
      }
      
      // Return updated demo request with restored schedule information
      const restoredDemo = {
        ...demoRequest,
        assignedTeam: teamNumber,
        assignedSlot: timeSlot,
        gridRow: gridRow,
        gridCol: gridCol,
        status: teamNumber ? 'assigned' as const : demoRequest.status, // Only mark as assigned if we found a team
        scheduledTeam: (demoRequest as any).scheduledTeam,
        scheduledTimeSlot: (demoRequest as any).scheduledTimeSlot
      };
      
      console.log(`✅ SCHEDULE RESTORE: Successfully restored schedule for ${demoRequest.clientName}:`, {
        team: teamNumber,
        timeSlot: timeSlot,
        gridPosition: gridRow !== undefined ? `${gridRow},${gridCol}` : 'not calculated',
        members: demoRequest.assignedMembers,
        finalStatus: restoredDemo.status
      });
      
      return restoredDemo;
    }
    
    // No schedule information to restore
    return demoRequest;
  } catch (error) {
    console.error(`💥 Error in restoreScheduleFromSheets for ${demoRequest.clientName}:`, error);
    // Return original demo request if there's any error
    return demoRequest;
  }
};

export const updateCsvData = (
  data: any, 
  source: 'csv' | 'csv-client' | 'mock',
  currentDemoRequests: DemoRequest[],
  currentTasks: Task[],
  setDemoRequests: (requests: DemoRequest[]) => void,
  setTasks: (tasks: Task[]) => void,
  setLastCsvUpdate: (date: string) => void,
  setDataSource: (source: 'csv' | 'csv-client' | 'mock') => void
) => {
  console.log(`📝 Updating data from source: ${source}`, {
    demoRequestsCount: data.demoRequests?.length || 0,
    tasksCount: data.tasks?.length || 0
  });
  
  try {
    if (data.demoRequests) {
      // Track status changes for workflow management
      const previousRequests = new Map(currentDemoRequests.map(req => [req.id, req]));
      
      console.log('🔍 SCHEDULE DISPLAY DEBUG - Previous requests count:', previousRequests.size);
      console.log('🔍 SCHEDULE DISPLAY DEBUG - New requests count:', data.demoRequests.length);
      
      // First, restore schedule information from Google Sheets
      const restoredRequests = data.demoRequests.map((newReq: DemoRequest) => {
        try {
          const restored = restoreScheduleFromSheets(newReq);
          console.log(`🔄 SCHEDULE DISPLAY - Restored request for ${newReq.clientName}:`, {
            originalTeam: newReq.assignedTeam,
            restoredTeam: restored.assignedTeam,
            originalSlot: newReq.assignedSlot,
            restoredSlot: restored.assignedSlot,
            assignedMembers: restored.assignedMembers,
            leadStatus: restored.leadStatus
          });
          return restored;
        } catch (error) {
          console.error(`💥 Error restoring schedule for ${newReq.clientName}:`, error);
          return newReq; // Return original request if restoration fails
        }
      });

      console.log('🔍 SCHEDULE DISPLAY DEBUG - After restoration, demos with teams:', 
        restoredRequests.filter(req => req.assignedTeam).map(req => ({
          name: req.clientName,
          team: req.assignedTeam,
          slot: req.assignedSlot,
          status: req.leadStatus,
          members: req.assignedMembers
        }))
      );

      const updatedRequests = restoredRequests.map((newReq: DemoRequest) => {
        // Try ID-based matching first (more reliable)
        const existingReqById = previousRequests.get(newReq.id);
        
        // Fallback to name/email matching (less reliable but needed for CSV updates)
        const existingReqByData = existingReqById || Array.from(previousRequests.values())
          .find(r => {
            const nameMatch = r.clientName.trim().toLowerCase() === newReq.clientName.trim().toLowerCase();
            const emailMatch = r.clientEmail.trim().toLowerCase() === newReq.clientEmail.trim().toLowerCase();
            return nameMatch && emailMatch;
          });
        
        if (existingReqByData && existingReqByData.leadStatus !== newReq.leadStatus) {
          console.log(`🔄 STATUS CHANGE DEBUG - Status change detected for ${newReq.clientName}:`, {
            oldStatus: existingReqByData.leadStatus,
            newStatus: newReq.leadStatus,
            oldAssignedTeam: existingReqByData.assignedTeam,
            newAssignedTeam: newReq.assignedTeam
          });
          
          // Status changed - track it
          const updatedRequest = {
            ...newReq,
            previousStatus: existingReqByData.leadStatus,
            statusChangedAt: new Date().toISOString(),
            statusChangedBy: source === 'mock' ? 'Mock Data' : 'CSV Update'
          };

          // IMPORTANT: Don't clear assignments for rescheduled demos if they're still assigned
          // Let them stay in the schedule with "rescheduled" status for visibility
          if (newReq.leadStatus === 'demo_rescheduled') {
            console.log(`🔄 RESCHEDULED DEMO - Keeping assignment for ${newReq.clientName} (Team: ${newReq.assignedTeam})`);
            // Keep the assignment but mark as rescheduled
          } else if (newReq.leadStatus === 'demo_cancelled') {
            console.log(`🔄 CANCELLED DEMO - Clearing assignments for ${newReq.clientName}`);
            updatedRequest.assignedTeam = undefined;
            updatedRequest.assignedSlot = undefined;
          }

          return updatedRequest;
        }
        
        // Log new requests for debugging
        if (!existingReqByData) {
          console.log(`🆕 NEW REQUEST DEBUG - New request: ${newReq.clientName}, status: ${newReq.leadStatus}, assignedTeam: ${newReq.assignedTeam}`);
        }
        
        return newReq;
      });

      setDemoRequests(updatedRequests);

      // Enhanced debug logging
      const statusCounts = {
        planned: updatedRequests.filter(req => req.leadStatus === 'demo_planned').length,
        given: updatedRequests.filter(req => req.leadStatus === 'demo_given').length,
        rescheduled: updatedRequests.filter(req => req.leadStatus === 'demo_rescheduled').length,
        cancelled: updatedRequests.filter(req => req.leadStatus === 'demo_cancelled').length
      };
      
      const assignmentCounts = {
        assigned: updatedRequests.filter(req => req.assignedTeam).length,
        unassigned: updatedRequests.filter(req => !req.assignedTeam).length,
        withRecipes: updatedRequests.filter(req => req.recipes && req.recipes.length > 0).length,
        rescheduledWithTeam: updatedRequests.filter(req => 
          req.leadStatus === 'demo_rescheduled' && req.assignedTeam
        ).length,
        rescheduledUnassigned: updatedRequests.filter(req => 
          req.leadStatus === 'demo_rescheduled' && !req.assignedTeam
        ).length,
        cancelledUnassigned: updatedRequests.filter(req => 
          req.leadStatus === 'demo_cancelled'
        ).length
      };
      
      console.log('🎯 SCHEDULE DISPLAY DEBUG - Status counts:', statusCounts);
      console.log('🎯 SCHEDULE DISPLAY DEBUG - Assignment counts:', assignmentCounts);
      
      // Log schedule restoration results
      const restoredCount = updatedRequests.filter(req => 
        req.assignedMembers && req.assignedMembers.length > 0 && req.assignedTeam
      ).length;
      
      const scheduledDemos = updatedRequests.filter(req => req.assignedTeam).map(req => ({
        name: req.clientName,
        team: req.assignedTeam,
        timeSlot: req.assignedSlot,
        status: req.status,
        leadStatus: req.leadStatus,
        members: req.assignedMembers || []
      }));
      
      console.log('🔄 FINAL SCHEDULE DEBUG - Summary:', {
        totalProcessed: updatedRequests.length,
        restoredFromSheets: restoredCount,
        currentlyScheduled: scheduledDemos.length,
        totalWithAssignedTeam: updatedRequests.filter(req => req.assignedTeam).length,
        allStatusCounts: {
          demo_planned: updatedRequests.filter(req => req.leadStatus === 'demo_planned').length,
          demo_given: updatedRequests.filter(req => req.leadStatus === 'demo_given').length,
          demo_rescheduled: updatedRequests.filter(req => req.leadStatus === 'demo_rescheduled').length,
          demo_cancelled: updatedRequests.filter(req => req.leadStatus === 'demo_cancelled').length
        }
      });
      
      if (scheduledDemos.length > 0) {
        console.log('📅 FINAL SCHEDULE DEBUG - Currently scheduled demos:', scheduledDemos);
      } else {
        console.log('⚠️ NO SCHEDULED DEMOS FOUND - This might be the issue!');
        console.log('🔍 Raw data check - demos with assignedTeam from source:', 
          updatedRequests.filter(req => req.assignedTeam).length
        );
      }
      
      // Enhanced debugging for all demos
      console.log('🔍 ALL DEMOS FINAL STATE:', updatedRequests.map(req => ({
        name: req.clientName,
        assignedTeam: req.assignedTeam,
        assignedSlot: req.assignedSlot,
        leadStatus: req.leadStatus,
        assignedMembers: req.assignedMembers || [],
        hasAssignment: Boolean(req.assignedTeam),
        hasRecipes: req.recipes && req.recipes.length > 0
      })));
      
      // Log specific unassigned requests with enhanced logic
      const unassignedFiltered = updatedRequests.filter(req => {
        // Show rescheduled demos back in unassigned if they don't have a team
        if (req.leadStatus === 'demo_rescheduled') {
          return !req.assignedTeam;
        }
        // Show cancelled demos in unassigned for visibility
        if (req.leadStatus === 'demo_cancelled') {
          return true;
        }
        // Show planned demos that aren't assigned yet
        return req.leadStatus === 'demo_planned' && !req.assignedTeam;
      });
      
      console.log('🎯 UNASSIGNED REQUESTS DEBUG:', unassignedFiltered.length, 
        unassignedFiltered.map(req => ({
          name: req.clientName,
          status: req.leadStatus,
          hasRecipes: req.recipes && req.recipes.length > 0,
          assignedTeam: req.assignedTeam
        }))
      );
    }
    
    // Handle tasks - preserve manually created tasks
    if (data.tasks !== undefined) {
      const csvTasks = data.tasks || [];
      const manualTasks = currentTasks.filter(task => 
        !task.id.startsWith('csv-task-') && 
        !task.id.startsWith('mock-task-')
      );
      setTasks([...csvTasks, ...manualTasks]);
    }

    setLastCsvUpdate(new Date().toISOString());
    setDataSource(source);

    const statusMsg = source === 'mock' ? '(Using enhanced sample data)' : '';
    console.log(`✅ Successfully loaded ${data.demoRequests?.length || 0} demo requests and ${data.tasks?.length || 0} tasks using ${source} ${statusMsg}`);
  } catch (updateError) {
    console.error('💥 Error updating CSV data:', updateError);
    // Ensure we still complete the loading process even if there's an error
    setLastCsvUpdate(new Date().toISOString());
    setDataSource(source);
  }
};