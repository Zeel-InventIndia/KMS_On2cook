import { DemoRequest } from '../types/DemoRequest';
import { Task } from '../types/Task';

// Helper function to get yesterday's date
export const yesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
};

// Enhanced mock fallback data for when CSV fails
export const createMockData = (): { demoRequests: DemoRequest[], tasks: Task[] } => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(tomorrow.getDate() + 1);
  
  return {
    demoRequests: [
      // Demo planned and assigned
      {
        id: 'mock-demo-1',
        clientName: 'Acme Restaurant',
        clientMobile: '+91 9876543210',
        clientEmail: 'acme@restaurant.com',
        assignee: 'madhuri',
        salesRep: 'sourabh',
        demoDate: today.toISOString().split('T')[0],
        demoTime: '10:00 AM',
        recipes: ['Paneer Tikka', 'Dal Makhani', 'Naan'],
        leadStatus: 'demo_planned',
        type: 'demo',
        demoMode: 'onsite',
        status: 'assigned',
        notes: 'High priority client - QSR chain',
        assignedTeam: 1,
        assignedSlot: '9:00 AM - 11:00 AM',
        assignedMembers: ['Manish', 'Pran Krishna']
      },
      // Demo given (completed)
      {
        id: 'mock-demo-2',
        clientName: 'Cloud Kitchen Co',
        clientMobile: '+91 9876543211',
        clientEmail: 'info@cloudkitchen.com',
        assignee: 'salim',
        salesRep: 'sapan',
        demoDate: yesterday(),
        demoTime: '2:00 PM',
        recipes: ['Biryani', 'Chicken Curry', 'Rice'],
        leadStatus: 'demo_given',
        type: 'demo',
        demoMode: 'onsite',
        status: 'completed',
        notes: 'Demo completed successfully',
        assignedTeam: 2,
        assignedSlot: '1:00 PM - 3:00 PM',
        completedBy: 'Shahid',
        completedAt: new Date().toISOString(),
        mediaUploaded: true,
        mediaLink: 'https://example.com/demo-media'
      },
      // Unassigned demo (pending)
      {
        id: 'mock-demo-3',
        clientName: 'Cafe Delight',
        clientMobile: '+91 9876543212',
        clientEmail: 'contact@cafedelight.com',
        assignee: 'ronit',
        salesRep: 'anmol',
        demoDate: tomorrow.toISOString().split('T')[0],
        demoTime: '11:00 AM',
        recipes: ['Masala Chai', 'Sandwiches', 'Pasta'],
        leadStatus: 'demo_planned',
        type: 'demo',
        demoMode: 'onsite',
        status: 'pending',
        notes: 'New cafe chain expansion'
      },
      // Another assigned demo for different team
      {
        id: 'mock-demo-4',
        clientName: 'Fine Dining Palace',
        clientMobile: '+91 9876543213',
        clientEmail: 'manager@finedining.com',
        assignee: 'madhuri',
        salesRep: 'sourabh',
        demoDate: dayAfter.toISOString().split('T')[0],
        demoTime: '6:00 PM',
        recipes: ['Tandoori Chicken', 'Kebabs', 'Butter Naan'],
        leadStatus: 'demo_planned',
        type: 'demo',
        demoMode: 'onsite',
        status: 'assigned',
        notes: 'High-end restaurant demo',
        assignedTeam: 3,
        assignedSlot: '5:00 PM - 7:00 PM',
        assignedMembers: ['Vikas', 'Krishna']
      },
      // Rescheduled demo (should appear in unassigned)
      {
        id: 'mock-demo-5',
        clientName: 'Food Truck Express',
        clientMobile: '+91 9876543214',
        clientEmail: 'info@foodtruck.com',
        assignee: 'salim',
        salesRep: 'sapan',
        demoDate: tomorrow.toISOString().split('T')[0],
        demoTime: '3:00 PM',
        recipes: ['Street Food', 'Chaat', 'Rolls'],
        leadStatus: 'demo_rescheduled',
        type: 'demo',
        demoMode: 'onsite',
        status: 'pending',
        notes: 'Client requested reschedule'
      },
      // Demo with schedule restoration data (simulates Column I from Google Sheets)
      {
        id: 'mock-demo-6',
        clientName: 'Hotel Grand Palace',
        clientMobile: '+91 9876543215',
        clientEmail: 'chef@grandpalace.com',
        assignee: 'madhuri',
        salesRep: 'sourabh',
        demoDate: tomorrow.toISOString().split('T')[0],
        demoTime: '12:00 PM',
        recipes: ['Mutton Curry', 'Chicken Biryani', 'Naan'],
        leadStatus: 'demo_planned',
        type: 'demo',
        demoMode: 'onsite',
        status: 'pending', // Will be updated to assigned during restoration
        notes: 'Kishore, Vikas | 11:00 AM - 1:00 PM', // Team assignment in Column I format
        assignedMembers: ['Kishore', 'Vikas'], // This should restore to Team 2
        scheduledTimeSlot: '11:00 AM - 1:00 PM'
      },
      // Another demo with different team assignment
      {
        id: 'mock-demo-7',
        clientName: 'Bistro Corner',
        clientMobile: '+91 9876543216',
        clientEmail: 'manager@bistrocorner.com',
        assignee: 'ronit',
        salesRep: 'anmol',
        demoDate: dayAfter.toISOString().split('T')[0],
        demoTime: '4:00 PM',
        recipes: ['Pasta', 'Pizza', 'Garlic Bread'],
        leadStatus: 'demo_planned',
        type: 'demo',
        demoMode: 'onsite',
        status: 'assigned',
        notes: 'Bistro chain demo',
        assignedTeam: 4,
        assignedSlot: '3:00 PM - 5:00 PM',
        assignedMembers: ['Bikram', 'Ganesh']
      },
      // Demo assigned to Team 5
      {
        id: 'mock-demo-8',
        clientName: 'Modern Kitchen Solutions',
        clientMobile: '+91 9876543217',
        clientEmail: 'info@modernkitchen.com',
        assignee: 'madhuri',
        salesRep: 'sourabh',
        demoDate: today.toISOString().split('T')[0],
        demoTime: '3:00 PM',
        recipes: ['Chinese Fried Rice', 'Manchurian', 'Hakka Noodles'],
        leadStatus: 'demo_planned',
        type: 'demo',
        demoMode: 'onsite',
        status: 'assigned',
        notes: 'Chinese cuisine specialist demo',
        assignedTeam: 5,
        assignedSlot: '1:00 PM - 3:00 PM',
        assignedMembers: ['Prathimesh', 'Rajesh', 'Suresh']
      },
      // Demo with legacy schedule format
      {
        id: 'mock-demo-9',
        clientName: 'Traditional Flavors',
        clientMobile: '+91 9876543218',
        clientEmail: 'owner@traditionalflavors.com',
        assignee: 'salim',
        salesRep: 'sapan',
        demoDate: tomorrow.toISOString().split('T')[0],
        demoTime: '1:00 PM',
        recipes: ['Rajma', 'Chole', 'Roti'],
        leadStatus: 'demo_planned',
        type: 'demo',
        demoMode: 'onsite',
        status: 'pending',
        notes: 'Scheduled: Team 1 at 1:00 PM - 3:00 PM (Grid: 2,0)', // Legacy format
        assignedMembers: ['Manish', 'Pran Krishna'],
        scheduledTeam: 'Team 1',
        scheduledTimeSlot: '1:00 PM - 3:00 PM',
        gridRow: 2,
        gridCol: 0
      },
      // Additional demo for Team 4 different time slot
      {
        id: 'mock-demo-10',
        clientName: 'Fast Food Junction',
        clientMobile: '+91 9876543219',
        clientEmail: 'orders@fastfoodjunction.com',
        assignee: 'ronit',
        salesRep: 'anmol',
        demoDate: today.toISOString().split('T')[0],
        demoTime: '5:00 PM',
        recipes: ['Burgers', 'Fries', 'Wraps'],
        leadStatus: 'demo_planned',
        type: 'demo',
        demoMode: 'onsite',
        status: 'assigned',
        notes: 'Quick service restaurant demo',
        assignedTeam: 4,
        assignedSlot: '5:00 PM - 7:00 PM',
        assignedMembers: ['Bikram', 'Ganesh']
      }
    ],
    tasks: [
      // Recipe development tasks
      {
        id: 'mock-task-1',
        title: 'Develop Low-Oil Biryani Recipe',
        type: 'recipe_development',
        date: today.toISOString().split('T')[0],
        time: '10:00 AM',
        status: 'completed',
        createdBy: 'madhuri',
        assignedMembers: ['Manish', 'Pran Krishna'],
        notes: 'Created new recipe for oil-conscious customers'
      },
      {
        id: 'mock-task-2',
        title: 'Quinoa Pulav Recipe Testing',
        type: 'recipe_development',
        date: yesterday(),
        time: '2:00 PM',
        status: 'completed',
        createdBy: 'salim',
        assignedMembers: ['Shahid'],
        notes: 'Health-focused recipe development'
      },
      // Device testing tasks
      {
        id: 'mock-task-3',
        title: 'Test New Pressure Cook Settings',
        type: 'device_testing',
        date: today.toISOString().split('T')[0],
        time: '11:00 AM',
        status: 'in_progress',
        createdBy: 'akshay',
        assignedMembers: ['Vikas', 'Krishna'],
        notes: 'Testing optimal pressure settings for different recipes'
      },
      {
        id: 'mock-task-4',
        title: 'Steam Function Calibration',
        type: 'device_testing',
        date: yesterday(),
        time: '9:00 AM',
        status: 'completed',
        createdBy: 'rishi',
        assignedMembers: ['Kishore'],
        notes: 'Ensuring consistent steam generation'
      },
      // Video shoots
      {
        id: 'mock-task-5',
        title: 'Demo Video - Tandoori Chicken',
        type: 'videoshoot',
        date: dayAfter.toISOString().split('T')[0],
        time: '3:00 PM',
        status: 'assigned',
        createdBy: 'vijay',
        assignedMembers: ['Bikram', 'Ganesh'],
        notes: 'Marketing video for social media campaign'
      },
      {
        id: 'mock-task-6',
        title: 'Recipe Tutorial - Dal Makhani',
        type: 'videoshoot',
        date: yesterday(),
        time: '4:00 PM',
        status: 'completed',
        createdBy: 'vijay',
        assignedMembers: ['Prathimesh'],
        notes: 'Step-by-step cooking tutorial'
      },
      // Events
      {
        id: 'mock-task-7',
        title: 'Food Expo Bangalore Setup',
        type: 'event',
        date: dayAfter.toISOString().split('T')[0],
        time: '8:00 AM',
        status: 'assigned',
        createdBy: 'sourabh',
        assignedMembers: ['Manish', 'Shahid', 'Vikas'],
        notes: 'Product showcase at Bangalore Food Expo'
      },
      {
        id: 'mock-task-8',
        title: 'Restaurant Owner Workshop',
        type: 'event',
        date: yesterday(),
        time: '6:00 PM',
        status: 'completed',
        createdBy: 'sapan',
        assignedMembers: ['Pran Krishna', 'Krishna'],
        notes: 'Educational workshop for restaurant owners'
      },
      // Additional tasks for new team members
      {
        id: 'mock-task-9',
        title: 'Recipe Optimization - South Indian',
        type: 'recipe_development',
        date: today.toISOString().split('T')[0],
        time: '1:00 PM',
        status: 'assigned',
        createdBy: 'rishi',
        assignedMembers: ['Rajesh', 'Suresh'],
        notes: 'Developing authentic South Indian recipes'
      },
      {
        id: 'mock-task-10',
        title: 'Equipment Maintenance Check',
        type: 'device_testing',
        date: tomorrow.toISOString().split('T')[0],
        time: '9:00 AM',
        status: 'assigned',
        createdBy: 'mandeep',
        assignedMembers: ['Prathimesh', 'Rajesh'],
        notes: 'Regular maintenance and calibration'
      }
    ]
  };
};