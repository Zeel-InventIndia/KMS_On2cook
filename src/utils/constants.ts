// Demo Requests CSV URL from Google Sheets - On2Cook Production Spreadsheet
// Using the new On2Cook spreadsheet: https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/edit?usp=sharing
// IMPORTANT: Make sure the spreadsheet is shared as "Anyone with the link can view"

// Primary CSV URL - using the correct gid from production config
// Note: gid=964863455 is the Demo_schedule sheet
export const HARDCODED_CSV_URL = 'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455';

// Alternative CSV URL formats for fallback - try different approaches with correct gid
export const ALTERNATIVE_CSV_URLS = [
  // Standard export formats with correct gid=964863455 (Demo_schedule sheet)
  'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=964863455',
  'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?exportFormat=csv&gid=964863455',
  // Try with gid=0 as fallback (might be first sheet)
  'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv&gid=0',
  // No gid (exports the first/active sheet)
  'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/export?format=csv',
  // Query-based export with correct gid
  'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/gviz/tq?tqx=out:csv&gid=964863455',
  // Query-based export without gid
  'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/gviz/tq?tqx=out:csv',
  // Published CSV (requires the sheet to be published to web) - using correct gid
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT_NxYVOE-M4nB2UQLWkI7VIZeX7lZbBxOzBCUg3tT9jFtLFMQ0iA-kL8wP5-RdLIbQFgOZy4pJ9M4h/pub?gid=964863455&single=true&output=csv',
  // Published CSV fallback without gid
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT_NxYVOE-M4nB2UQLWkI7VIZeX7lZbBxOzBCUg3tT9jFtLFMQ0iA-kL8wP5-RdLIbQFgOZy4pJ9M4h/pub?output=csv'
];

// On2Cook Spreadsheet Configuration
export const ON2COOK_SPREADSHEET_ID = '1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM';
export const ON2COOK_SHEET_NAME = 'Demo_schedule';

// Full spreadsheet URL for reference
export const ON2COOK_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1voRSFvWZiksr568KeUzfAZkCl7hDocya7jM1qstfmsM/edit?usp=sharing';

// Recipe Repository CSV URL from Google Sheets
// Convert from: https://docs.google.com/spreadsheets/d/e/2PACX-1vQFNX3hnCOVGEE47iz9IMpM1b07nxeKnEhOckPeRagn7sp7Z7Wm4xYkYK87eQmkE8WtiK5H7WRwNFjs/pubhtml?gid=1168477131&single=true
// To CSV export format:
export const RECIPE_REPOSITORY_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQFNX3hnCOVGEE47iz9IMpM1b07nxeKnEhOckPeRagn7sp7Z7Wm4xYkYK87eQmkE8WtiK5H7WRwNFjs/pub?gid=1168477131&output=csv';

// Team member definitions
export const PRESALES_TEAM = ['madhuri', 'salim', 'ronit'];
export const SALES_TEAM = ['sourabh', 'sapan', 'anmol'];
export const CEO_TEAM = ['sandy', 'jyoti'];
export const HEAD_CHEFS = ['akshay', 'rishi', 'mandeep'];

// Kitchen team members divided into groups
export const KITCHEN_TEAM_MEMBERS = [
  'Manish',
  'Pran Krishna', 
  'Shahid',
  'Kishore',
  'Vikas',
  'Krishna',
  'Bikram',
  'Ganesh',
  'Prathimesh',
  'Rajesh',
  'Suresh'
];

// Team groups - Kitchen team members divided into teams (5 teams)
export const TEAM_GROUPS = [
  { id: 1, name: 'Team 1', members: ['Manish', 'Pran Krishna'] },
  { id: 2, name: 'Team 2', members: ['Shahid', 'Kishore'] },
  { id: 3, name: 'Team 3', members: ['Vikas', 'Krishna'] },
  { id: 4, name: 'Team 4', members: ['Bikram', 'Ganesh'] },
  { id: 5, name: 'Team 5', members: ['Prathimesh', 'Rajesh', 'Suresh'] }
];

// Time slots for scheduling
export const TIME_SLOTS = [
  '9:00 AM - 11:00 AM',
  '11:00 AM - 1:00 PM', 
  '1:00 PM - 3:00 PM',
  '3:00 PM - 5:00 PM',
  '5:00 PM - 7:00 PM'
];

// Demo user names for different roles
export const DEMO_USER_NAMES = {
  presales: ['Madhuri', 'Salim', 'Ronit'],
  sales: ['Sourabh', 'Sapan', 'Anmol'],
  head_chef: ['Akshay', 'Rishi', 'Mandeep'],
  ceo: ['Sandy', 'Jyoti']
};

// Helper function to get team member name from team ID and member index
export const getTeamMemberName = (teamId: number, memberIndex: number = 0): string | null => {
  const team = TEAM_GROUPS.find(group => group.id === teamId);
  if (!team || memberIndex >= team.members.length) {
    return null;
  }
  return team.members[memberIndex];
};