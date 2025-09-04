import { User } from '../types/User';
import { DemoRequest } from '../types/DemoRequest';
import { Task } from '../types/Task';

export const mockUsers: User[] = [
  // Head Chefs
  { id: '1', name: 'Akshay', role: 'head_chef' },
  { id: '2', name: 'Rishi', role: 'head_chef' },
  { id: '3', name: 'Mandeep', role: 'head_chef' },
  
  // Presales Team
  { id: '4', name: 'Madhuri', role: 'presales' },
  { id: '5', name: 'Salim', role: 'presales' },
  { id: '6', name: 'Ronit', role: 'presales' },
  
  // Sales Team
  { id: '7', name: 'Sourabh', role: 'sales' },
  { id: '8', name: 'Sapan', role: 'sales' },
  { id: '9', name: 'Anmol', role: 'sales' },
  
  // CEO
  { id: '10', name: 'Sandy', role: 'ceo' },
  { id: '11', name: 'Jyoti', role: 'ceo' },
  
  // Culinary Team
  { id: '12', name: 'Manish', role: 'culinary_team', team: 1 },
  { id: '13', name: 'Pran Krishna', role: 'culinary_team', team: 2 },
  { id: '14', name: 'Shahid', role: 'culinary_team', team: 3 },
  { id: '15', name: 'Kishore', role: 'culinary_team', team: 4 },
  { id: '16', name: 'Vikas', role: 'culinary_team', team: 5 },
  { id: '17', name: 'Krishna', role: 'culinary_team', team: 1 },
  { id: '18', name: 'Bikram', role: 'culinary_team', team: 2 },
  { id: '19', name: 'Ganesh', role: 'culinary_team', team: 3 },
  { id: '20', name: 'Prathimesh', role: 'culinary_team', team: 4 },
  
  // Vijay
  { id: '21', name: 'Vijay', role: 'vijay' }
];

// Team members for team management
export const mockTeamMembers: TeamMember[] = [
  // Team 1
  { id: '12', name: 'Manish', isActive: true },
  { id: '17', name: 'Krishna', isActive: true },
  { id: '22', name: 'Rahul Sharma', isActive: true },
  { id: '23', name: 'Amit Kumar', isActive: false },
  
  // Team 2
  { id: '13', name: 'Pran Krishna', isActive: true },
  { id: '18', name: 'Bikram', isActive: true },
  { id: '24', name: 'Suresh Patel', isActive: true },
  { id: '25', name: 'Deepak Singh', isActive: true },
  
  // Team 3
  { id: '14', name: 'Shahid', isActive: true },
  { id: '19', name: 'Ganesh', isActive: true },
  { id: '26', name: 'Rajesh Gupta', isActive: false },
  
  // Team 4
  { id: '15', name: 'Kishore', isActive: true },
  { id: '20', name: 'Prathimesh', isActive: true },
  { id: '27', name: 'Vinod Yadav', isActive: true },
  { id: '28', name: 'Sanjay Mishra', isActive: true },
  
  // Team 5
  { id: '16', name: 'Vikas', isActive: true },
  { id: '29', name: 'Arjun Reddy', isActive: true },
  { id: '30', name: 'Kiran Kumar', isActive: false },
  
  // Unassigned members
  { id: '31', name: 'Ravi Prakash', isActive: true },
  { id: '32', name: 'Mohan Das', isActive: true },
  { id: '33', name: 'Ajay Verma', isActive: false },
  { id: '34', name: 'Rohit Jha', isActive: true },
  { id: '35', name: 'Naveen Kumar', isActive: true }
];

// Initial team structure
export const mockTeams: Team[] = [
  {
    id: 1,
    name: 'Team Alpha',
    members: [
      { id: '12', name: 'Manish', isActive: true },
      { id: '17', name: 'Krishna', isActive: true },
      { id: '22', name: 'Rahul Sharma', isActive: true }
    ]
  },
  {
    id: 2,
    name: 'Team Beta',
    members: [
      { id: '13', name: 'Pran Krishna', isActive: true },
      { id: '18', name: 'Bikram', isActive: true },
      { id: '24', name: 'Suresh Patel', isActive: true },
      { id: '25', name: 'Deepak Singh', isActive: true }
    ]
  },
  {
    id: 3,
    name: 'Team Gamma',
    members: [
      { id: '14', name: 'Shahid', isActive: true },
      { id: '19', name: 'Ganesh', isActive: true }
    ]
  },
  {
    id: 4,
    name: 'Team Delta',
    members: [
      { id: '15', name: 'Kishore', isActive: true },
      { id: '20', name: 'Prathimesh', isActive: true },
      { id: '27', name: 'Vinod Yadav', isActive: true },
      { id: '28', name: 'Sanjay Mishra', isActive: true }
    ]
  },
  {
    id: 5,
    name: 'Team Epsilon',
    members: [
      { id: '16', name: 'Vikas', isActive: true },
      { id: '29', name: 'Arjun Reddy', isActive: true }
    ]
  }
];

export const mockDemoRequests: DemoRequest[] = [
  {
    id: 'demo-001',
    clientName: 'Rajesh Kumar',
    clientMobile: '+91 9876543210',
    clientEmail: 'rajesh@example.com',
    demoDate: '2024-01-15',
    demoTime: '10:00',
    recipes: ['Butter Chicken', 'Naan Bread'],
    salesRep: 'madhuri',
    leadStatus: 'demo_given',
    specialTag: 'QSR',
    type: 'demo',
    demoMode: 'onsite',
    notes: 'Interested in QSR setup',
    assignedTeam: 1,
    assignedSlot: '10:00-12:00',
    status: 'completed',
    completedBy: 'Team Lead 1',
    completedAt: '2024-01-15T12:00:00Z',
    mediaUploaded: false
  },
  {
    id: 'demo-002',
    clientName: 'Priya Sharma',
    clientMobile: '+91 9876543211',
    clientEmail: 'priya@example.com',
    demoDate: '2024-01-16',
    demoTime: '14:00',
    recipes: ['Biryani', 'Raita'],
    salesRep: 'salim',
    leadStatus: 'demo_given',
    specialTag: 'Cloud kitchen',
    type: 'demo',
    demoMode: 'onsite',
    notes: 'Cloud kitchen setup required',
    assignedTeam: 2,
    assignedSlot: '14:00-16:00',
    status: 'completed',
    completedBy: 'Team Lead 2',
    completedAt: '2024-01-16T16:00:00Z',
    mediaUploaded: false
  },
  {
    id: 'demo-003',
    clientName: 'Arjun Mehta',
    clientMobile: '+91 9876543212',
    clientEmail: 'arjun@example.com',
    demoDate: '2024-01-17',
    demoTime: '11:00',
    recipes: ['Dosa', 'Sambar', 'Chutney'],
    salesRep: 'ronit',
    leadStatus: 'demo_given',
    type: 'deployment',
    demoMode: 'onsite',
    notes: 'Equipment deployment and training',
    assignedTeam: 3,
    assignedSlot: '11:00-13:00',
    status: 'completed',
    completedBy: 'Team Lead 3',
    completedAt: '2024-01-17T13:00:00Z',
    mediaUploaded: true,
    dropboxLink: 'https://drive.google.com/drive/folders/mock-folder-123'
  },
  {
    id: 'demo-1',
    clientName: 'ABC Restaurant',
    clientMobile: '+91 9876543210',
    clientEmail: 'abc@restaurant.com',
    demoDate: '2025-08-25', // Today
    demoTime: '10:00',
    recipes: ['Biryani', 'Butter Chicken', 'Naan'],
    salesRep: 'Sourabh',
    leadStatus: 'demo_planned',
    specialTag: 'QSR',
    type: 'demo',
    demoMode: 'onsite',
    status: 'assigned',
    assignedTeam: 1,
    assignedSlot: '2025-08-25-09:00'
  },
  {
    id: 'demo-2',
    clientName: 'XYZ Cloud Kitchen',
    clientMobile: '+91 8765432109',
    clientEmail: 'xyz@cloudkitchen.com',
    demoDate: '2025-08-25', // Today
    demoTime: '14:00',
    recipes: ['Pizza', 'Pasta'],
    salesRep: 'Sapan',
    leadStatus: 'demo_planned',
    specialTag: 'Cloud kitchen',
    type: 'demo',
    demoMode: 'virtual',
    status: 'assigned',
    assignedTeam: 2,
    assignedSlot: '2025-08-25-13:00'
  },
  {
    id: 'demo-3',
    clientName: 'Food Corp Ltd',
    clientMobile: '+91 7654321098',
    clientEmail: 'food@corp.com',
    demoDate: '2025-08-27',
    demoTime: '11:00',
    recipes: ['Custom Recipe'],
    salesRep: 'Anmol',
    leadStatus: 'demo_planned',
    specialTag: 'business',
    type: 'demo',
    demoMode: 'onsite',
    status: 'pending'
  },
  {
    id: 'deploy-1',
    clientName: 'Kitchen Solutions',
    clientMobile: '+91 6543210987',
    clientEmail: 'solutions@kitchen.com',
    demoDate: '2025-08-25', // Today
    demoTime: '09:00',
    recipes: [],
    salesRep: 'Sourabh',
    leadStatus: 'demo_planned',
    type: 'deployment',
    status: 'completed',
    assignedTeam: 3,
    assignedSlot: '2025-08-25-09:00',
    completedBy: 'Shahid',
    completedAt: '2025-08-25T11:00:00Z'
  },
  {
    id: 'recipe-1',
    clientName: 'New Recipe Request',
    clientMobile: '+91 5432109876',
    clientEmail: 'recipe@request.com',
    demoDate: '2025-08-27',
    demoTime: '16:00',
    recipes: ['Fusion Curry'],
    salesRep: 'Madhuri',
    leadStatus: 'demo_planned',
    type: 'recipe_development',
    status: 'pending',
    notes: 'Need to develop fusion curry recipe with specific spice requirements'
  },
  {
    id: 'demo-4',
    clientName: 'Premium Dining',
    clientMobile: '+91 4321098765',
    clientEmail: 'premium@dining.com',
    demoDate: '2025-08-25', // Today
    demoTime: '15:00',
    recipes: ['Fine Dining Menu'],
    salesRep: 'Sapan',
    leadStatus: 'demo_planned',
    specialTag: 'business',
    type: 'demo',
    status: 'in_progress',
    assignedTeam: 4,
    assignedSlot: '2025-08-25-15:00'
  },
  {
    id: 'demo-5',
    clientName: 'Quick Bites',
    clientMobile: '+91 3210987654',
    clientEmail: 'quick@bites.com',
    demoDate: '2025-08-28',
    demoTime: '13:00',
    recipes: ['Fast Food Items'],
    salesRep: 'Anmol',
    leadStatus: 'demo_planned',
    specialTag: 'QSR',
    type: 'demo',
    status: 'pending'
  },
  {
    id: 'recipe-2',
    clientName: 'Healthy Fusion Salad Bowl',
    clientMobile: '',
    clientEmail: '',
    demoDate: '2025-08-30',
    demoTime: '14:00',
    recipes: ['Quinoa Base', 'Mediterranean Dressing'],
    salesRep: 'Madhuri',
    leadStatus: 'demo_planned',
    type: 'recipe_development',
    status: 'pending',
    notes: 'Develop a healthy fusion salad bowl with quinoa base and custom Mediterranean dressing. Target health-conscious customers.'
  },
  {
    id: 'deploy-2',
    clientName: 'Metro Kitchen Solutions',
    clientMobile: '+91 9876012345',
    clientEmail: 'metro@kitchen.com',
    demoDate: '2025-08-29',
    demoTime: '10:00',
    recipes: [],
    salesRep: 'Sapan',
    leadStatus: 'demo_planned',
    specialTag: 'business',
    type: 'deployment',
    status: 'pending',
    notes: 'Complete kitchen setup deployment for new restaurant location. Includes oven installation and staff training.'
  }
];

export const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Video Shoot - Biryani Recipe',
    type: 'videoshoot',
    date: '2025-08-25', // Today
    time: '11:00',
    assignedTeam: 5,
    assignedSlot: '2025-08-25-11:00',
    status: 'assigned',
    createdBy: 'Akshay',
    notes: 'Shoot high-quality video for marketing'
  },
  {
    id: 'task-2',
    title: 'Device Testing - New Oven',
    type: 'device_testing',
    date: '2025-08-25', // Today
    time: '17:00',
    assignedTeam: 1,
    assignedSlot: '2025-08-25-17:00',
    status: 'assigned',
    createdBy: 'Rishi',
    notes: 'Test temperature accuracy and cooking times'
  },
  {
    id: 'task-3',
    title: 'Food Festival Event',
    type: 'event',
    date: '2025-08-28',
    time: '10:00',
    status: 'pending',
    createdBy: 'Mandeep',
    notes: 'Prepare dishes for annual food festival'
  },
  {
    id: 'task-4',
    title: 'Recipe Development - Healthy Options',
    type: 'recipe_development',
    date: '2025-08-25', // Today
    time: '19:00',
    assignedTeam: 2,
    assignedSlot: '2025-08-25-19:00',
    status: 'completed',
    createdBy: 'Akshay',
    notes: 'Develop low-calorie recipe variants'
  },
  {
    id: 'task-5',
    title: 'Weekly Equipment Maintenance',
    type: 'device_testing',
    date: '2025-08-25',
    time: '11:00',
    status: 'pending',
    createdBy: 'Rishi',
    notes: 'Routine maintenance check for all kitchen equipment'
  },
  {
    id: 'task-6',
    title: 'New Menu Photography',
    type: 'videoshoot',
    date: '2025-08-25',
    time: '13:00',
    status: 'pending',
    createdBy: 'Akshay',
    notes: 'Photography session for new menu items'
  },
  {
    id: 'task-7',
    title: 'Spice Blend Development',
    type: 'recipe_development',
    date: '2025-08-25',
    time: '15:00',
    status: 'pending',
    createdBy: 'Mandeep',
    clientName: 'Spice Masters Inc',
    notes: 'Create custom spice blend for client requirements'
  }
];

export const culinaryTeamMembers = [
  'Manish', 'Pran Krishna', 'Shahid', 'Kishore', 'Vikas', 
  'Krishna', 'Bikram', 'Ganesh', 'Prathimesh'
];

export const timeSlots = [
  '09:00', '11:00', '13:00', '15:00', '17:00', '19:00'
];

export const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];