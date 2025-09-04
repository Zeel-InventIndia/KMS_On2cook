export enum TaskType {
  DEMO = 'demo',
  DEPLOYMENT = 'deployment',
  RECIPE_DEVELOPMENT = 'recipe_development',
  VIDEOSHOOT = 'videoshoot',
  EVENT = 'event',
  DEVICE_TESTING = 'device_testing'
}

export enum TaskStatus {
  PLANNED = 'planned',
  RESCHEDULED = 'rescheduled',
  CANCELLED = 'cancelled',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  UPLOADED = 'uploaded'
}

export enum LeadTag {
  QSR = 'QSR',
  CLOUD_KITCHEN = 'Cloud Kitchen',
  BUSINESS = 'Business'
}

export enum DemoMode {
  ONSITE = 'onsite',
  VIRTUAL = 'virtual'
}

export interface Task {
  id: string;
  title: string;
  type: 'demo' | 'deployment' | 'videoshoot' | 'event' | 'recipe_development' | 'device_testing';
  date: string;
  time: string;
  assignedTeam?: number;
  assignedSlot?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  createdBy: string;
  notes?: string;
  clientName?: string;
  assignedMembers?: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Team {
  id: number;
  name: string;
  members: TeamMember[];
}

export interface TimeSlot {
  start: string;
  end: string;
  isAvailable: boolean;
  task?: Task;
}