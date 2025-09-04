/**
 * CSV Parser utilities for server-side processing
 * Contains helper functions for parsing dates and normalizing status values
 */

/**
 * Helper function to normalize lead status from CSV
 */
export const normalizeLeadStatus = (rawStatus: string): 'demo_planned' | 'demo_rescheduled' | 'demo_cancelled' | 'demo_given' => {
  // Handle null, undefined, or empty values
  if (!rawStatus || rawStatus === null || rawStatus === undefined) {
    console.warn(`Empty lead status provided, defaulting to demo_planned`);
    return 'demo_planned';
  }
  
  const status = String(rawStatus).trim().toLowerCase();
  
  // Handle empty string after trimming
  if (!status) {
    console.warn(`Empty lead status after trimming, defaulting to demo_planned`);
    return 'demo_planned';
  }
  
  // Handle various formats that might come from Google Sheets
  if (status === 'demo planned' || status === 'demo_planned' || status === 'planned') {
    return 'demo_planned';
  } else if (status === 'demo rescheduled' || status === 'demo_rescheduled' || status === 'rescheduled') {
    return 'demo_rescheduled';
  } else if (status === 'demo cancelled' || status === 'demo_cancelled' || status === 'cancelled' || status === 'canceled') {
    return 'demo_cancelled';
  } else if (status === 'demo given' || status === 'demo_given' || status === 'given' || status === 'completed') {
    return 'demo_given';
  }
  
  // Check if this looks like a person name (common error when CSV columns are misaligned)
  const isLikelyPersonName = /^[A-Za-z\s]+$/.test(status) && status.length > 2 && status.length < 50;
  if (isLikelyPersonName) {
    console.warn(`Lead status "${rawStatus}" looks like a person name - possible CSV column misalignment. Defaulting to demo_planned`);
  } else {
    console.warn(`Unknown lead status: "${rawStatus}", defaulting to demo_planned`);
  }
  
  return 'demo_planned';
};

/**
 * Robust date and time parsing function for server-side processing
 */
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
    
    console.log(`📅 Server date parsing: "${dateTimeString}" → date: "${formattedDate}", time: "${timeString}"`);
    
    return { date: formattedDate, time: timeString };
    
  } catch (error) {
    console.error(`Error parsing date/time: "${dateTimeString}"`, error);
    return { 
      date: new Date().toISOString().split('T')[0], 
      time: '10:00 AM' 
    };
  }
};