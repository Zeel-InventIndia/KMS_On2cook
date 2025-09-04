import React, { useState, useEffect } from 'react';
import { AuthenticatedLoginForm } from './components/AuthenticatedLoginForm';
import { DashboardWithReporting } from './components/DashboardWithReporting';
import { VijayView } from './components/VijayView';
import { supabase } from './utils/supabase/client';
import { User } from './types/User';
import { DemoRequest } from './types/DemoRequest';
import { Task } from './types/Task';
import { Recipe } from './types/Recipe';
import { 
  KITCHEN_TEAM_MEMBERS, 
  DEMO_USER_NAMES,
  TEAM_GROUPS,
  TIME_SLOTS,
  ON2COOK_SPREADSHEET_ID,
  ON2COOK_SHEET_NAME,
  HARDCODED_CSV_URL
} from './utils/constants';
import { 
  loadOn2CookConfig, 
  updateOn2CookConfig 
} from './utils/on2cookConfig';
import { 
  getAllowedTimeSlots, 
  formatDateSafely, 
  getFilteredDemoRequests 
} from './utils/helpers';
import { createMockData } from './utils/mockDataHelpers';
import { fetchCsvDataFromServer, fetchCsvDataFromClient } from './utils/csvDataService';
import { updateCsvData } from './utils/dataUpdateHelpers';
import { handleUpdateDemoRequest, handleAddDemoRequest, handleTestRecipePersistence } from './utils/demoRequestHandlers';

// Export the constants and helpers for other components to use
export { KITCHEN_TEAM_MEMBERS, TEAM_GROUPS, TIME_SLOTS, getAllowedTimeSlots, formatDateSafely };

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingCsv, setIsLoadingCsv] = useState(false);
  const [lastCsvUpdate, setLastCsvUpdate] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'csv' | 'csv-client' | 'mock' | 'loading'>('loading');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [sheetsConfigured, setSheetsConfigured] = useState(false);
  const [lastFetchAttempt, setLastFetchAttempt] = useState<number>(0);

  useEffect(() => {
    // Load On2Cook configuration - force update with production config
    const configLoaded = loadOn2CookConfig();
    
    // If no config was loaded, set the default production config using constants
    if (!configLoaded) {
      const productionConfig = {
        spreadsheetId: ON2COOK_SPREADSHEET_ID,
        sheetName: ON2COOK_SHEET_NAME,
        csvUrl: HARDCODED_CSV_URL
      };
      updateOn2CookConfig(productionConfig);
    }
    
    setSheetsConfigured(true); // Always mark as configured since we have production config
    
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser({
            id: session.user.id,
            name: session.user.user_metadata?.name || 'Test User',
            role: session.user.user_metadata?.role || 'head_chef',
            team: session.user.user_metadata?.team
          });
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setCurrentUser({
            id: session.user.id,
            name: session.user.user_metadata?.name || 'Test User',
            role: session.user.user_metadata?.role || 'head_chef',
            team: session.user.user_metadata?.team
          });
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Auto-fetch data on initial load with delay to allow app to render first
  useEffect(() => {
    // Small delay to allow UI to render first, then fetch data
    const timer = setTimeout(() => {
      fetchCsvData(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Auto-refresh CSV data periodically (only if not using mock data)
  // Reduced frequency to prevent schedule reset issues
  useEffect(() => {
    if (dataSource !== 'loading' && dataSource !== 'mock') {
      const interval = setInterval(() => {
        // Only auto-refresh if user hasn't interacted recently
        const timeSinceLastInteraction = Date.now() - lastFetchAttempt;
        const minIdleTime = 30 * 60 * 1000; // 30 minutes of idle time
        
        if (timeSinceLastInteraction > minIdleTime) {
          console.log('🔄 Auto-refresh triggered after idle period');
          fetchCsvData(false); // Silent refresh
        } else {
          console.log('⏸️ Auto-refresh skipped - recent user activity detected');
        }
      }, 30 * 60 * 1000); // Check every 30 minutes instead of 10

      return () => clearInterval(interval);
    }
  }, [dataSource, lastFetchAttempt]);

  const fetchCsvData = async (showLoading = true) => {
    // Rate limiting to prevent spam requests (minimum 30 seconds between attempts)
    const now = Date.now();
    const timeSinceLastAttempt = now - lastFetchAttempt;
    const minInterval = 30000; // 30 seconds
    
    if (timeSinceLastAttempt < minInterval && lastFetchAttempt > 0) {
      console.log(`⏳ Rate limiting: ${Math.ceil((minInterval - timeSinceLastAttempt) / 1000)}s until next attempt allowed`);
      return;
    }
    
    setLastFetchAttempt(now);
    
    if (showLoading) setIsLoadingCsv(true);
    setCsvError(null);

    console.log('🔄 Starting CSV data fetch...');
    
    let lastError: Error | null = null;
    let useDirectMockFallback = false;

    try {
      // First, try server-side approach with better error handling
      console.log('🌐 Attempting server-side fetch...');
      const serverData = await fetchCsvDataFromServer(showLoading);
      updateCsvData(serverData, 'csv', demoRequests, tasks, setDemoRequests, setTasks, setLastCsvUpdate, setDataSource);
      if (showLoading) setIsLoadingCsv(false);
      return; // Success, exit early
    } catch (serverError) {
      console.error('🌐 Server-side fetch failed:', serverError);
      const errorMessage = serverError instanceof Error ? serverError.message : 'Unknown error';
      
      // Check for Google Sheets access errors - go directly to mock data
      if (errorMessage.includes('Page not found') || 
          errorMessage.includes('Sorry, unable to open the file') ||
          errorMessage.includes('Google Sheets access denied') ||
          errorMessage.includes('404')) {
        console.log('🔄 Detected Google Sheets access error, skipping client-side attempt and using mock data');
        useDirectMockFallback = true;
      }
      
      lastError = serverError instanceof Error ? serverError : new Error('Server fetch failed');
    }

    // Only try client-side if we haven't detected a Google Sheets access issue
    if (!useDirectMockFallback) {
      try {
        // Fallback to client-side approach
        console.log('💻 Attempting client-side fetch...');
        const clientData = await fetchCsvDataFromClient(showLoading);
        updateCsvData(clientData, 'csv-client', demoRequests, tasks, setDemoRequests, setTasks, setLastCsvUpdate, setDataSource);
        if (showLoading) setIsLoadingCsv(false);
        return; // Success, exit early
      } catch (clientError) {
        console.warn('💻 Client-side fetch failed:', clientError);
        const clientErrorMessage = clientError instanceof Error ? clientError.message : 'Client fetch failed';
        
        // Also check client-side errors for Google Sheets access issues
        if (clientErrorMessage.includes('Page not found') || 
            clientErrorMessage.includes('Sorry, unable to open the file') ||
            clientErrorMessage.includes('Google Sheets access denied') ||
            clientErrorMessage.includes('404')) {
          useDirectMockFallback = true;
        }
        
        lastError = clientError instanceof Error ? clientError : new Error('Client fetch failed');
      }
    }

    // Both approaches failed or Google Sheets access denied, use mock data
    console.log('🔄 Loading mock data as fallback...');
    
    let errorMessage = 'Unable to access Google Sheets data. Using sample data for demonstration.';
    if (lastError) {
      if (lastError.message.includes('Page not found') || 
          lastError.message.includes('Sorry, unable to open the file') ||
          lastError.message.includes('Google Sheets access denied')) {
        errorMessage = 'Google Sheets access issue: The On2Cook spreadsheet may not be shared publicly or the sheet ID may be incorrect. Using sample data for demonstration. Check that the spreadsheet is shared as "Anyone with the link can view".';
      } else {
        errorMessage = `Data fetch failed: ${lastError.message}. Using sample data for demonstration.`;
      }
    }
    
    setCsvError(errorMessage);
    
    // Load enhanced mock data as fallback
    console.log('🔧 TESTING: Loading enhanced mock data with schedule restoration test cases...');
    const mockData = createMockData();
    console.log('🔧 TESTING: Mock data created, demo requests with assigned members:', 
      mockData.demoRequests.filter(req => req.assignedMembers && req.assignedMembers.length > 0).map(req => ({
        name: req.clientName,
        members: req.assignedMembers,
        status: req.status,
        notes: req.notes
      }))
    );
    updateCsvData(mockData, 'mock', demoRequests, tasks, setDemoRequests, setTasks, setLastCsvUpdate, setDataSource);
    
    // Always clear loading state regardless of success/failure
    if (showLoading) setIsLoadingCsv(false);
  };





  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleDemoLogin = (role: User['role'], team?: number) => {
    // Create a demo user based on role
    let userName = `Demo ${role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
    
    // Use specific names for different roles
    if (role === 'presales') {
      userName = DEMO_USER_NAMES.presales[Math.floor(Math.random() * DEMO_USER_NAMES.presales.length)];
    } else if (role === 'sales') {
      userName = DEMO_USER_NAMES.sales[Math.floor(Math.random() * DEMO_USER_NAMES.sales.length)];
    } else if (role === 'head_chef') {
      userName = DEMO_USER_NAMES.head_chef[Math.floor(Math.random() * DEMO_USER_NAMES.head_chef.length)];
    } else if (role === 'ceo') {
      userName = DEMO_USER_NAMES.ceo[Math.floor(Math.random() * DEMO_USER_NAMES.ceo.length)];
    } else if (role === 'culinary_team') {
      // Use actual kitchen team member names
      userName = KITCHEN_TEAM_MEMBERS[Math.floor(Math.random() * KITCHEN_TEAM_MEMBERS.length)];
    }

    const demoUser: User = {
      id: `demo-${role}-${Date.now()}`,
      name: userName,
      role,
      team
    };
    setCurrentUser(demoUser);
  };

  const handleLogout = async () => {
    try {
      // Only sign out from Supabase if it's not a demo user
      if (currentUser && !currentUser.id.startsWith('demo-')) {
        await supabase.auth.signOut();
      }
      setCurrentUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      // Force logout even if there's an error
      setCurrentUser(null);
    }
  };

  const handleDemoRequestUpdate = (updatedRequest: DemoRequest) => {
    handleUpdateDemoRequest(updatedRequest, currentUser, setDemoRequests);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => 
      prev.map(task => task.id === updatedTask.id ? updatedTask : task)
    );
  };

  const handleAddTask = (newTask: Task) => {
    setTasks(prev => [...prev, newTask]);
  };

  const handleDemoRequestAdd = (newRequest: DemoRequest) => {
    handleAddDemoRequest(newRequest, currentUser, setDemoRequests);
  };

  const handleRefreshCsv = () => {
    console.log('🔄 Manual refresh triggered - will restore schedules from Google Sheets');
    fetchCsvData(true);
  };

  const handleRecipePersistenceTest = (demoRequest: DemoRequest) => {
    handleTestRecipePersistence(demoRequest, currentUser, handleDemoRequestUpdate, fetchCsvData);
  };

  // Use the extracted filtering function
  const filteredDemoRequests = getFilteredDemoRequests(demoRequests, currentUser);
  
  // Enhanced debugging for schedule display issue
  console.log('🔍 APP DEBUG - Demo requests processing:');
  console.log('🔍 APP DEBUG - Total demoRequests:', demoRequests.length);
  console.log('🔍 APP DEBUG - Filtered demoRequests:', filteredDemoRequests.length);
  console.log('🔍 APP DEBUG - Demos with assignedTeam:', demoRequests.filter(req => req.assignedTeam).length);
  console.log('🔍 APP DEBUG - Schedule-ready demos:', demoRequests.filter(req => req.assignedTeam && req.assignedSlot).map(req => ({
    name: req.clientName,
    team: req.assignedTeam,
    slot: req.assignedSlot,
    status: req.leadStatus
  })));
  console.log('🔍 APP DEBUG - Current user:', currentUser?.name, currentUser?.role);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!currentUser) {
    return <AuthenticatedLoginForm onLogin={handleLogin} onDemoLogin={handleDemoLogin} />;
  }



  // Special case for Vijay - keep separate view
  if (currentUser.role === 'vijay') {
    return (
      <VijayView 
        user={currentUser} 
        demoRequests={filteredDemoRequests}
        tasks={tasks}
        onUpdateDemoRequest={handleDemoRequestUpdate}
        onLogout={handleLogout} 
      />
    );
  }

  // Use unified dashboard with reporting for all other roles
  return (
    <div className="min-h-screen bg-background">
      <DashboardWithReporting 
        user={currentUser} 
        demoRequests={filteredDemoRequests}
        allDemoRequests={demoRequests}
        tasks={tasks}
        onUpdateDemoRequest={handleDemoRequestUpdate}
        onUpdateTask={handleUpdateTask}
        onAddTask={handleAddTask}
        onAddDemoRequest={handleDemoRequestAdd}
        onLogout={handleLogout}
        onRefreshSheets={handleRefreshCsv}
        isLoadingSheets={isLoadingCsv}
        lastSheetsUpdate={lastCsvUpdate}
        dataSource={dataSource === 'loading' ? 'csv' : dataSource}
        csvError={csvError}
        onTestRecipePersistence={handleRecipePersistenceTest}
      />
    </div>
  );
}