import { DemoRequest } from '../types/DemoRequest';
import { Task } from '../types/Task';
import { createMockData } from './mockDataHelpers';

export interface LocalDataStore {
  demoRequests: DemoRequest[];
  tasks: Task[];
  scheduleData: { [demoId: string]: { gridRow: number, gridCol: number, teamName: string, timeSlot: string } };
  recipeAssignments: { [demoId: string]: string[] };
  lastUpdated: string;
  version: number;
  userUpdates: {
    [demoId: string]: {
      recipes?: string[];
      notes?: string;
      mediaLink?: string;
      updatedBy?: string;
      updatedAt?: string;
    };
  };
}

class LocalDataManager {
  private storageKey = 'on2cook_local_data_v2';
  
  // Load data from localStorage or create fresh data
  loadData(): LocalDataStore {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate structure
        if (this.isValidDataStructure(parsed)) {
          console.log('✅ Loaded local data:', parsed.demoRequests?.length || 0, 'demos');
          return parsed;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error loading local data:', error);
    }

    // Create fresh data if none exists or invalid
    console.log('📝 Creating fresh local data');
    const mockData = createMockData();
    const freshData: LocalDataStore = {
      demoRequests: mockData.demoRequests,
      tasks: mockData.tasks,
      scheduleData: {},
      recipeAssignments: {},
      userUpdates: {},
      lastUpdated: new Date().toISOString(),
      version: 2
    };
    
    this.saveData(freshData);
    return freshData;
  }

  // Save data to localStorage
  saveData(data: LocalDataStore): void {
    try {
      data.lastUpdated = new Date().toISOString();
      data.version = 2;
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      console.log('💾 Data saved locally at', new Date().toLocaleString());
    } catch (error) {
      console.error('❌ Failed to save data locally:', error);
    }
  }

  // Update a demo request and save
  updateDemoRequest(demoId: string, updates: Partial<DemoRequest>): void {
    const data = this.loadData();
    
    // Find and update the demo
    const demoIndex = data.demoRequests.findIndex(d => d.id === demoId);
    if (demoIndex !== -1) {
      data.demoRequests[demoIndex] = {
        ...data.demoRequests[demoIndex],
        ...updates
      };
      
      // Track user updates separately for potential sync later
      if (updates.recipes || updates.notes || updates.mediaLink) {
        data.userUpdates[demoId] = {
          ...data.userUpdates[demoId],
          recipes: updates.recipes,
          notes: updates.notes, 
          mediaLink: updates.mediaLink,
          updatedBy: 'Offline Mode',
          updatedAt: new Date().toISOString()
        };
      }
      
      this.saveData(data);
      console.log('✅ Demo request updated locally:', demoId);
    }
  }

  // Update schedule data (grid positions)
  updateScheduleData(demoId: string, gridRow: number | null, gridCol: number | null, teamName?: string, timeSlot?: string): void {
    const data = this.loadData();
    
    if (gridRow !== null && gridCol !== null && teamName && timeSlot) {
      data.scheduleData[demoId] = { gridRow, gridCol, teamName, timeSlot };
      console.log(`📍 Schedule saved locally: ${demoId} -> ${teamName} at ${timeSlot}`);
    } else {
      delete data.scheduleData[demoId];
      console.log(`📍 Schedule cleared locally: ${demoId}`);
    }
    
    this.saveData(data);
  }

  // Get schedule data
  getScheduleData(demoId?: string): any {
    const data = this.loadData();
    return demoId ? data.scheduleData[demoId] : data.scheduleData;
  }

  // Add a new task
  addTask(task: Task): void {
    const data = this.loadData();
    data.tasks.push(task);
    this.saveData(data);
    console.log('✅ Task added locally:', task.id);
  }

  // Update a task
  updateTask(taskId: string, updates: Partial<Task>): void {
    const data = this.loadData();
    const taskIndex = data.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      data.tasks[taskIndex] = { ...data.tasks[taskIndex], ...updates };
      this.saveData(data);
      console.log('✅ Task updated locally:', taskId);
    }
  }

  // Import external data (when services come back online)
  importExternalData(newData: { demoRequests: DemoRequest[], tasks: Task[] }): void {
    const localData = this.loadData();
    
    // Merge external data with local updates
    const mergedDemoRequests = newData.demoRequests.map(externalDemo => {
      const localUpdates = localData.userUpdates[externalDemo.id];
      const scheduleData = localData.scheduleData[externalDemo.id];
      
      return {
        ...externalDemo,
        // Apply local updates
        ...(localUpdates && {
          recipes: localUpdates.recipes || externalDemo.recipes,
          notes: localUpdates.notes || externalDemo.notes,
          mediaLink: localUpdates.mediaLink || externalDemo.mediaLink
        }),
        // Apply schedule data
        ...(scheduleData && {
          gridRow: scheduleData.gridRow,
          gridCol: scheduleData.gridCol,
          scheduledTeam: scheduleData.teamName,
          scheduledTimeSlot: scheduleData.timeSlot
        })
      };
    });

    const mergedData: LocalDataStore = {
      demoRequests: mergedDemoRequests,
      tasks: [...newData.tasks, ...localData.tasks], // Merge tasks
      scheduleData: localData.scheduleData, // Keep local schedule
      recipeAssignments: localData.recipeAssignments,
      userUpdates: localData.userUpdates, // Keep for future sync
      lastUpdated: new Date().toISOString(),
      version: 2
    };
    
    this.saveData(mergedData);
    console.log('🔄 External data imported and merged with local changes');
  }

  // Clear all local data
  clearData(): void {
    localStorage.removeItem(this.storageKey);
    console.log('🗑️ Local data cleared');
  }

  // Get data summary
  getDataSummary(): { demos: number, tasks: number, schedules: number, updates: number } {
    const data = this.loadData();
    return {
      demos: data.demoRequests.length,
      tasks: data.tasks.length,
      schedules: Object.keys(data.scheduleData).length,
      updates: Object.keys(data.userUpdates).length
    };
  }

  private isValidDataStructure(data: any): boolean {
    return data && 
           Array.isArray(data.demoRequests) && 
           Array.isArray(data.tasks) &&
           typeof data.scheduleData === 'object' &&
           typeof data.version === 'number';
  }
}

export const localDataManager = new LocalDataManager();