import { TIME_SLOTS } from './constants';
import type { DemoRequest } from '../App';

// Helper function to determine allowed time slots based on demo time
export const getAllowedTimeSlots = (demoTime: string): string[] => {
  const time = demoTime.toLowerCase();
  
  if (time.includes('9:') || time.includes('10:')) {
    return ['9:00 AM - 11:00 AM'];
  } else if (time.includes('11:') || time.includes('12:')) {
    return ['11:00 AM - 1:00 PM'];
  } else if (time.includes('1:') || time.includes('2:')) {
    return ['1:00 PM - 3:00 PM'];
  } else if (time.includes('3:') || time.includes('4:')) {
    return ['3:00 PM - 5:00 PM'];
  } else if (time.includes('5:') || time.includes('6:')) {
    return ['5:00 PM - 7:00 PM'];
  }
  
  // Default to all slots if time can't be parsed
  return TIME_SLOTS;
};

// Helper function to normalize lead status from CSV
export const normalizeLeadStatus = (rawStatus: string): 'demo_planned' | 'demo_rescheduled' | 'demo_cancelled' | 'demo_given' => {
  const status = String(rawStatus).trim().toLowerCase();
  
  // Handle various formats that might come from Google Sheets
  if (status === 'demo planned' || status === 'demo_planned' || status === 'planned') {
    return 'demo_planned';
  } else if (status === 'demo rescheduled' || status === 'demo_rescheduled' || status === 'rescheduled' || 
             status === 'demo reschedule' || status === 'reschedule') {
    return 'demo_rescheduled';
  } else if (status === 'demo cancelled' || status === 'demo_cancelled' || status === 'cancelled' || 
             status === 'canceled' || status === 'demo cancel' || status === 'cancel') {
    return 'demo_cancelled';
  } else if (status === 'demo given' || status === 'demo_given' || status === 'given' || 
             status === 'completed' || status === 'done') {
    return 'demo_given';
  }
  
  // Default fallback with better logging
  console.warn(`Unknown lead status: "${rawStatus}", defaulting to demo_planned`);
  return 'demo_planned';
};

// Robust date and time parsing function
export const parseCsvDateAndTime = (dateTimeString: string): { date: string; time: string } => {
  try {
    const input = String(dateTimeString).trim();
    
    if (!input) {
      return { date: new Date().toISOString().split('T')[0], time: '10:00 AM' };
    }

    let parsedDate: Date | null = null;
    let timeString = '10:00 AM'; // default time

    // Handle format: DD/MM/YY;HH:MM (e.g., "29/08/25;12:00")
    if (input.includes(';')) {
      const [datePart, timePart] = input.split(';');
      
      // Parse DD/MM/YY format
      if (datePart.includes('/')) {
        const [day, month, year] = datePart.split('/');
        const fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
        parsedDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
        
        // Parse time part
        if (timePart) {
          const [hours, minutes] = timePart.split(':');
          const hour24 = parseInt(hours);
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
          const ampm = hour24 >= 12 ? 'PM' : 'AM';
          timeString = `${hour12}:${minutes.padStart(2, '0')} ${ampm}`;
        }
      }
    }
    // Handle format: DD/MM/YYYY or DD/MM/YY (date only)
    else if (input.includes('/')) {
      const parts = input.split(' ');
      const datePart = parts[0];
      const [day, month, year] = datePart.split('/');
      
      let fullYear = parseInt(year);
      if (year.length === 2) {
        fullYear = parseInt(year) < 50 ? 2000 + parseInt(year) : 1900 + parseInt(year);
      }
      
      parsedDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
      
      // Check if there's a time part after the date
      if (parts.length > 1) {
        timeString = parts.slice(1).join(' ');
      }
    }
    // Handle ISO format or other standard formats
    else if (input.includes('-')) {
      parsedDate = new Date(input);
      
      // Extract time if present
      if (input.includes('T') || input.includes(' ')) {
        const dateObj = new Date(input);
        if (!isNaN(dateObj.getTime())) {
          const hours = dateObj.getHours();
          const minutes = dateObj.getMinutes();
          const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
          const ampm = hours >= 12 ? 'PM' : 'AM';
          timeString = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        }
      }
    }
    // Handle MM/DD/YYYY format (US format)
    else {
      parsedDate = new Date(input);
    }

    // Validate parsed date
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      console.warn(`Failed to parse date: "${dateTimeString}", using current date`);
      parsedDate = new Date();
    }

    // Format date as YYYY-MM-DD
    const formattedDate = parsedDate.toISOString().split('T')[0];
    
    console.log(`📅 Date parsing: "${dateTimeString}" → date: "${formattedDate}", time: "${timeString}"`);
    
    return { date: formattedDate, time: timeString };
    
  } catch (error) {
    console.error(`Error parsing date/time: "${dateTimeString}"`, error);
    return { 
      date: new Date().toISOString().split('T')[0], 
      time: '10:00 AM' 
    };
  }
};

// Safe date formatter for display - Fixed timezone issues
export const formatDateSafely = (dateString: string, fallbackFormat = 'Invalid Date'): string => {
  try {
    if (!dateString) return fallbackFormat;
    
    // Handle YYYY-MM-DD format - Fixed timezone issues
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse date components to avoid timezone issues
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      
      if (isNaN(date.getTime())) return fallbackFormat;
      
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    // Handle other formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return fallbackFormat;
    
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return fallbackFormat;
  }
};

// Filter demo requests based on user role and name
export const getFilteredDemoRequests = (
  demoRequests: DemoRequest[], 
  currentUser: { name: string; role: string; team?: number } | null
): DemoRequest[] => {
  if (!currentUser) return demoRequests;

  const userName = currentUser.name.toLowerCase();

  console.log('🔍 FILTERING DEBUG - User:', currentUser.name, 'Role:', currentUser.role, 'Total demos:', demoRequests.length);

  switch (currentUser.role) {
    case 'presales':
      // Show ALL demos assigned to this presales team member (they see everything they're assigned)
      const presalesFiltered = demoRequests.filter(req => 
        req.assignee === userName &&
        ['demo_planned', 'demo_rescheduled', 'demo_given'].includes(req.leadStatus)
      );
      console.log('🔍 PRESALES FILTERING - Results:', presalesFiltered.length, presalesFiltered.map(r => r.clientName));
      return presalesFiltered;
    
    case 'sales':
      // Show only demos with recipes where this person is the sales rep
      const salesFiltered = demoRequests.filter(req => 
        req.salesRep.toLowerCase() === userName &&
        req.recipes && req.recipes.length > 0
      );
      console.log('🔍 SALES FILTERING - Results:', salesFiltered.length, salesFiltered.map(r => r.clientName));
      return salesFiltered;
    
    case 'head_chef':
      // Show ALL demos with recipes for head chef management (includes rescheduled for reassignment)
      const headChefFiltered = demoRequests.filter(req => 
        req.recipes && req.recipes.length > 0
      );
      console.log('🔍 HEAD CHEF FILTERING - Results:', headChefFiltered.length, headChefFiltered.map(r => ({
        name: r.clientName,
        status: r.leadStatus,
        hasTeam: Boolean(r.assignedTeam)
      })));
      return headChefFiltered;
    
    case 'culinary_team':
      // Show only demos with recipes assigned to this team member or their team
      const culinaryFiltered = demoRequests.filter(req => 
        req.recipes && req.recipes.length > 0 &&
        (
          (req.assignedMembers && req.assignedMembers.includes(currentUser.name)) ||
          (req.assignedTeam === currentUser.team)
        )
      );
      console.log('🔍 CULINARY FILTERING - Results:', culinaryFiltered.length, culinaryFiltered.map(r => r.clientName));
      return culinaryFiltered;
    
    case 'vijay':
      // Show ALL completed demos that need media processing (regardless of recipes)
      const vijayFiltered = demoRequests.filter(req => 
        req.leadStatus === 'demo_given'
      );
      console.log('🎯 VIJAY DEBUG - Filtered results for Vijay:', vijayFiltered.length, vijayFiltered.map(r => r.clientName));
      return vijayFiltered;
    
    case 'ceo':
      // CEO sees all requests with recipes
      const ceoFiltered = demoRequests.filter(req => 
        req.recipes && req.recipes.length > 0
      );
      console.log('🔍 CEO FILTERING - Results:', ceoFiltered.length, ceoFiltered.map(r => r.clientName));
      return ceoFiltered;
    
    default:
      const defaultFiltered = demoRequests.filter(req => 
        req.recipes && req.recipes.length > 0
      );
      console.log('🔍 DEFAULT FILTERING - Results:', defaultFiltered.length, defaultFiltered.map(r => r.clientName));
      return defaultFiltered;
  }
};

// Helper function to get all demo requests for schedule views (includes demo_given for visibility)
export const getScheduleViewDemoRequests = (
  allDemoRequests: DemoRequest[]
): DemoRequest[] => {
  // Include all demos that are either assigned to teams or have demo_given status for complete visibility
  return allDemoRequests.filter(req => 
    req.assignedTeam || 
    req.recipes.length > 0 || 
    req.leadStatus === 'demo_given'
  );
};