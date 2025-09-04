export enum UserRole {
  HEAD_CHEF = 'head_chef',
  PRESALES = 'presales',
  SALES = 'sales',
  CEO = 'ceo',
  CULINARY_TEAM = 'culinary_team',
  CONTENT_MANAGER = 'content_manager' // Vijay
}

export interface User {
  id: string;
  name: string;
  role: 'head_chef' | 'presales' | 'sales' | 'ceo' | 'culinary_team' | 'vijay';
  team?: number;
}

export const USERS = {
  // Head Chefs
  akshay: { id: 'akshay', name: 'Akshay', role: UserRole.HEAD_CHEF, email: 'akshay@on2cook.com' },
  rishi: { id: 'rishi', name: 'Rishi', role: UserRole.HEAD_CHEF, email: 'rishi@on2cook.com' },
  mandeep: { id: 'mandeep', name: 'Mandeep', role: UserRole.HEAD_CHEF, email: 'mandeep@on2cook.com' },
  
  // Presales Team
  madhuri: { id: 'madhuri', name: 'Madhuri', role: UserRole.PRESALES, email: 'madhuri@on2cook.com' },
  salim: { id: 'salim', name: 'Salim', role: UserRole.PRESALES, email: 'salim@on2cook.com' },
  ronit: { id: 'ronit', name: 'Ronit', role: UserRole.PRESALES, email: 'ronit@on2cook.com' },
  
  // Sales Team
  sourabh: { id: 'sourabh', name: 'Sourabh', role: UserRole.SALES, email: 'sourabh@on2cook.com' },
  sapan: { id: 'sapan', name: 'Sapan', role: UserRole.SALES, email: 'sapan@on2cook.com' },
  anmol: { id: 'anmol', name: 'Anmol', role: UserRole.SALES, email: 'anmol@on2cook.com' },
  
  // CEO
  sandy: { id: 'sandy', name: 'Sandy', role: UserRole.CEO, email: 'sandy@on2cook.com' },
  jyoti: { id: 'jyoti', name: 'Jyoti', role: UserRole.CEO, email: 'jyoti@on2cook.com' },
  
  // Culinary Team
  manish: { id: 'manish', name: 'Manish', role: UserRole.CULINARY_TEAM, email: 'manish@on2cook.com' },
  prankrishna: { id: 'prankrishna', name: 'Pran Krishna', role: UserRole.CULINARY_TEAM, email: 'prankrishna@on2cook.com' },
  shahid: { id: 'shahid', name: 'Shahid', role: UserRole.CULINARY_TEAM, email: 'shahid@on2cook.com' },
  kishore: { id: 'kishore', name: 'Kishore', role: UserRole.CULINARY_TEAM, email: 'kishore@on2cook.com' },
  vikas: { id: 'vikas', name: 'Vikas', role: UserRole.CULINARY_TEAM, email: 'vikas@on2cook.com' },
  krishna: { id: 'krishna', name: 'Krishna', role: UserRole.CULINARY_TEAM, email: 'krishna@on2cook.com' },
  bikram: { id: 'bikram', name: 'Bikram', role: UserRole.CULINARY_TEAM, email: 'bikram@on2cook.com' },
  ganesh: { id: 'ganesh', name: 'Ganesh', role: UserRole.CULINARY_TEAM, email: 'ganesh@on2cook.com' },
  prathimesh: { id: 'prathimesh', name: 'Prathimesh', role: UserRole.CULINARY_TEAM, email: 'prathimesh@on2cook.com' },
  
  // Content Manager
  vijay: { id: 'vijay', name: 'Vijay', role: UserRole.CONTENT_MANAGER, email: 'vijay@on2cook.com' }
};