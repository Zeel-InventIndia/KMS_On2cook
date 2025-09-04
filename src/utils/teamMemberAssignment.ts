import { TEAM_GROUPS, KITCHEN_TEAM_MEMBERS } from './constants';

// Team member assignment counter for round-robin distribution
let teamAssignmentCounters: Record<number, number> = {};

/**
 * Get team members for a specific team
 */
export const getTeamMembers = (teamId: number): string[] => {
  const teamGroup = TEAM_GROUPS.find(group => group.id === teamId);
  if (!teamGroup) return [];
  
  return teamGroup.members;
};

/**
 * Assign a team member using round-robin distribution within the team
 * @deprecated Use assignAllTeamMembers instead for full team assignment
 */
export const assignTeamMember = (teamId: number): string | null => {
  const teamMembers = getTeamMembers(teamId);
  
  if (teamMembers.length === 0) {
    console.warn(`No team members found for team ${teamId}`);
    return null;
  }
  
  // Initialize counter for this team if it doesn't exist
  if (!(teamId in teamAssignmentCounters)) {
    teamAssignmentCounters[teamId] = 0;
  }
  
  // Get the next team member using round-robin
  const memberIndex = teamAssignmentCounters[teamId] % teamMembers.length;
  const assignedMember = teamMembers[memberIndex];
  
  // Increment counter for next assignment
  teamAssignmentCounters[teamId] = (teamAssignmentCounters[teamId] + 1) % teamMembers.length;
  
  console.log(`🎯 Team ${teamId} assignment: ${assignedMember} (${memberIndex + 1}/${teamMembers.length})`);
  
  return assignedMember;
};

/**
 * Assign ALL team members for a team (for complete team assignment)
 */
export const assignAllTeamMembers = (teamId: number): string[] => {
  const teamMembers = getTeamMembers(teamId);
  
  if (teamMembers.length === 0) {
    console.warn(`No team members found for team ${teamId}`);
    return [];
  }
  
  console.log(`👥 Team ${teamId} full assignment: ${teamMembers.join(', ')} (${teamMembers.length} members)`);
  
  return [...teamMembers]; // Return a copy of all team members
};

/**
 * Get formatted team assignment info for display
 */
export const getTeamAssignmentInfo = (teamId: number, timeSlot: string, memberName?: string): string => {
  const teamGroup = TEAM_GROUPS.find(group => group.id === teamId);
  const teamName = teamGroup ? teamGroup.name : `Team ${teamId}`;
  
  if (memberName) {
    return `${teamName} - ${memberName} (${timeSlot})`;
  } else {
    return `${teamName} (${timeSlot})`;
  }
};

/**
 * Reset team assignment counters (useful for testing or daily resets)
 */
export const resetTeamAssignmentCounters = (): void => {
  teamAssignmentCounters = {};
  console.log('🔄 Team assignment counters reset');
};

/**
 * Get current assignment counters (for debugging)
 */
export const getTeamAssignmentCounters = (): Record<number, number> => {
  return { ...teamAssignmentCounters };
};