import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  X,
  Eye,
  RefreshCw,
  AlertCircle,
  Grid3X3
} from 'lucide-react';
import { DemoRequest, User } from '../App';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { ToastContainer, ToastProps } from './Toast';

interface GridScheduleProps {
  user: User;
  demoRequests: DemoRequest[];
  onUpdateDemoRequest: (request: DemoRequest) => void;
}

interface GridCoordinate {
  demoId: string;
  gridRow: number;
  gridCol: number;
  teamName?: string;
  timeSlot?: string;
  updatedAt: string;
}

export function GridSchedule({ user, demoRequests, onUpdateDemoRequest }: GridScheduleProps) {
  const [gridData, setGridData] = useState<{ [key: string]: DemoRequest }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedDemo, setDraggedDemo] = useState<DemoRequest | null>(null);
  const [availableDemos, setAvailableDemos] = useState<DemoRequest[]>([]);
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  // Grid is 5x5
  const GRID_SIZE = 5;

  // Toast management
  const addToast = (toast: Omit<ToastProps, 'id'>) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // API helper function
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const url = `https://${projectId}.supabase.co/functions/v1/make-server-3005c377${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  };

  // Load grid coordinates from backend and Google Sheets data
  const loadGridData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Try to get coordinates from backend first
      const result = await apiCall('/grid/get-all-coordinates');
      const coordinates: GridCoordinate[] = result.data || [];
      
      // Create a map of grid positions to demos
      const newGridData: { [key: string]: DemoRequest } = {};
      const placedDemoIds: string[] = [];
      
      // First, place demos based on backend coordinates
      coordinates.forEach(coord => {
        const demo = demoRequests.find(d => d.id === coord.demoId);
        if (demo && coord.gridRow !== null && coord.gridCol !== null) {
          const key = `${coord.gridRow}-${coord.gridCol}`;
          newGridData[key] = demo;
          placedDemoIds.push(demo.id);
        }
      });
      
      // Then, place demos based on schedule information from Google Sheets
      demoRequests.forEach(demo => {
        // Skip if already placed or if doesn't have grid position
        if (placedDemoIds.includes(demo.id) || 
            demo.gridRow === null || demo.gridRow === undefined || 
            demo.gridCol === null || demo.gridCol === undefined) {
          return;
        }
        
        // If demo has grid position from Google Sheets but wasn't in backend
        const key = `${demo.gridRow}-${demo.gridCol}`;
        if (!newGridData[key]) {
          newGridData[key] = demo;
          placedDemoIds.push(demo.id);
          
          console.log(`📍 Restored demo ${demo.clientName} to grid position (${demo.gridRow}, ${demo.gridCol}) from Google Sheets`);
          
          // Sync backend with Google Sheets data
          try {
            saveDemoPosition(demo.id, demo.gridRow, demo.gridCol, demo);
          } catch (syncError) {
            console.warn('⚠️ Failed to sync backend with Google Sheets position:', syncError);
          }
        }
      });
      
      setGridData(newGridData);
      
      // Set available demos (those not placed on grid)
      const available = demoRequests.filter(demo => 
        !placedDemoIds.includes(demo.id) &&
        (demo.leadStatus === 'demo_planned' || demo.leadStatus === 'demo_rescheduled')
      );
      
      setAvailableDemos(available);
      
    } catch (error) {
      console.error('Error loading grid data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load grid data');
      
      // Fallback: try to use Google Sheets data if available
      const newGridData: { [key: string]: DemoRequest } = {};
      const placedDemoIds: string[] = [];
      
      demoRequests.forEach(demo => {
        if (demo.gridRow !== null && demo.gridRow !== undefined && 
            demo.gridCol !== null && demo.gridCol !== undefined) {
          const key = `${demo.gridRow}-${demo.gridCol}`;
          newGridData[key] = demo;
          placedDemoIds.push(demo.id);
        }
      });
      
      setGridData(newGridData);
      
      // Show remaining demos as available
      const available = demoRequests.filter(demo => 
        !placedDemoIds.includes(demo.id) &&
        (demo.leadStatus === 'demo_planned' || demo.leadStatus === 'demo_rescheduled')
      );
      
      setAvailableDemos(available);
    } finally {
      setIsLoading(false);
    }
  };

  // Grid position to team and time slot mapping
  const getTeamAndTimeSlot = (gridRow: number, gridCol: number) => {
    // Teams: Row 0-4 map to Team 1-5
    const teamId = gridRow + 1;
    const teamName = `Team ${teamId}`;
    
    // Time slots: Col 0-4 map to different time slots
    const timeSlots = [
      '9:00 AM - 11:00 AM',
      '11:00 AM - 1:00 PM',
      '1:00 PM - 3:00 PM', 
      '3:00 PM - 5:00 PM',
      '5:00 PM - 7:00 PM'
    ];
    const timeSlot = timeSlots[gridCol] || 'Unknown Time';
    
    return { teamName, timeSlot };
  };

  // Save demo position to backend and automatically update Google Sheets
  const saveDemoPosition = async (demoId: string, gridRow: number | null, gridCol: number | null, demo?: DemoRequest) => {
    try {
      let teamName = null;
      let timeSlot = null;
      
      // If placing on grid, calculate team and time slot
      if (gridRow !== null && gridCol !== null) {
        const scheduleInfo = getTeamAndTimeSlot(gridRow, gridCol);
        teamName = scheduleInfo.teamName;
        timeSlot = scheduleInfo.timeSlot;
        
        console.log(`📅 Auto-scheduling demo "${demo?.clientName}" to ${teamName} at ${timeSlot} (Grid: ${gridRow},${gridCol})`);
      } else {
        console.log(`📅 Removing demo "${demo?.clientName}" from schedule`);
      }
      
      await apiCall('/grid/update-coordinates', {
        method: 'POST',
        body: JSON.stringify({
          demoId,
          gridRow,
          gridCol,
          clientName: demo?.clientName,
          clientEmail: demo?.clientEmail,
          teamName,
          timeSlot
        })
      });
      
      if (gridRow !== null && gridCol !== null) {
        console.log(`✅ Demo scheduled and Google Sheets auto-updated: ${demo?.clientName} → ${teamName} at ${timeSlot}`);
        addToast({
          type: 'success',
          title: '📋 Google Sheets Updated',
          message: `${demo?.clientName} scheduled to ${teamName} at ${timeSlot}`
        });
      } else {
        console.log(`✅ Demo removed from schedule and Google Sheets cleared: ${demo?.clientName}`);
        addToast({
          type: 'success',
          title: '🗑️ Schedule Cleared',
          message: `${demo?.clientName} removed from schedule and sheets updated`
        });
      }
    } catch (error) {
      console.error('Error saving demo position and updating sheets:', error);
      addToast({
        type: 'error',
        title: '❌ Update Failed',
        message: `Failed to update Google Sheets for ${demo?.clientName}`
      });
      throw error;
    }
  };

  // Load data on component mount and when demoRequests change
  useEffect(() => {
    loadGridData();
  }, [demoRequests]);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, demo: DemoRequest) => {
    setDraggedDemo(demo);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetRow: number, targetCol: number) => {
    e.preventDefault();
    
    if (!draggedDemo) return;
    
    try {
      const targetKey = `${targetRow}-${targetCol}`;
      
      // Check if target cell is occupied
      if (gridData[targetKey]) {
        alert('This cell is already occupied. Please choose an empty cell.');
        return;
      }
      
      // Find current position of dragged demo
      let currentKey: string | null = null;
      for (const [key, demo] of Object.entries(gridData)) {
        if (demo.id === draggedDemo.id) {
          currentKey = key;
          break;
        }
      }
      
      // Update grid data locally
      const newGridData = { ...gridData };
      
      // Remove from current position
      if (currentKey) {
        delete newGridData[currentKey];
      }
      
      // Add to new position
      newGridData[targetKey] = draggedDemo;
      setGridData(newGridData);
      
      // Update available demos
      if (!currentKey) {
        // Demo was from available list, remove it
        setAvailableDemos(prev => prev.filter(d => d.id !== draggedDemo.id));
      }
      
      // Save position to backend and auto-update Google Sheets
      await saveDemoPosition(draggedDemo.id, targetRow, targetCol, draggedDemo);
      
      // Update the demo request with grid coordinates
      const updatedDemo = {
        ...draggedDemo,
        gridRow: targetRow,
        gridCol: targetCol
      };
      onUpdateDemoRequest(updatedDemo);
      
      // Show success feedback to user
      const { teamName, timeSlot } = getTeamAndTimeSlot(targetRow, targetCol);
      console.log(`🎯 SUCCESS: "${draggedDemo.clientName}" automatically scheduled to ${teamName} at ${timeSlot} and saved to Google Sheets`);
      
    } catch (error) {
      console.error('Error dropping demo:', error);
      addToast({
        type: 'error',
        title: '❌ Drop Failed',
        message: 'Failed to place demo. Please try again.'
      });
      // Reload data to ensure consistency
      loadGridData();
    } finally {
      setDraggedDemo(null);
    }
  };

  const handleRemoveFromGrid = async (demo: DemoRequest, row: number, col: number) => {
    try {
      const key = `${row}-${col}`;
      
      // Update grid data locally
      const newGridData = { ...gridData };
      delete newGridData[key];
      setGridData(newGridData);
      
      // Add back to available demos
      setAvailableDemos(prev => [...prev, demo]);
      
      // Remove position from backend and clear Google Sheets schedule info
      await saveDemoPosition(demo.id, null, null, demo);
      
      // Update the demo request to remove grid coordinates
      const updatedDemo = {
        ...demo,
        gridRow: undefined,
        gridCol: undefined
      };
      onUpdateDemoRequest(updatedDemo);
      
      // Show removal feedback to user
      console.log(`🗑️ SUCCESS: "${demo.clientName}" removed from schedule and Google Sheets cleared`);
      
    } catch (error) {
      console.error('Error removing demo from grid:', error);
      addToast({
        type: 'error',
        title: '❌ Removal Failed',
        message: 'Failed to remove demo from grid. Please try again.'
      });
      loadGridData();
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'demo_planned': return 'bg-green-100 text-green-800 border-green-200';
      case 'demo_rescheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'demo_cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'demo_given': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderGridCell = (row: number, col: number) => {
    const key = `${row}-${col}`;
    const demo = gridData[key];
    
    return (
      <div
        key={key}
        className={`border-2 border-dashed border-gray-300 rounded-lg p-2 min-h-[120px] transition-colors ${
          draggedDemo && !demo ? 'border-green-400 bg-green-50 border-solid shadow-sm' : 
          draggedDemo && demo ? 'border-red-400 bg-red-50' : ''
        }`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, row, col)}
      >
        {demo ? (
          <div className="bg-white border border-gray-200 rounded p-2 shadow-sm h-full relative group">
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-0 right-0 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleRemoveFromGrid(demo, row, col)}
            >
              <X className="h-3 w-3" />
            </Button>
            
            <div className="space-y-1">
              <h4 className="font-medium text-sm truncate pr-6">{demo.clientName}</h4>
              
              {/* Schedule information */}
              <div className="text-xs bg-blue-50 rounded px-1 py-0.5">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {getTeamAndTimeSlot(row, col).teamName}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {getTeamAndTimeSlot(row, col).timeSlot}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Grid: ({row + 1},{col + 1}) • Auto-synced ✓
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(demo.demoDate)}
                </div>
                {demo.demoTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {demo.demoTime}
                  </div>
                )}
              </div>
              <Badge className={`${getStatusColor(demo.leadStatus)} text-xs`}>
                {demo.leadStatus.replace('_', ' ')}
              </Badge>
              {demo.recipes.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {demo.recipes.length} recipe{demo.recipes.length === 1 ? '' : 's'}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`h-full flex flex-col items-center justify-center text-xs p-1 ${
            draggedDemo ? 'text-green-600 font-medium' : 'text-gray-400'
          }`}>
            <div className="font-medium">{getTeamAndTimeSlot(row, col).teamName}</div>
            <div className="text-center">{getTeamAndTimeSlot(row, col).timeSlot}</div>
            <div className="mt-1">Grid: ({row + 1},{col + 1})</div>
            <div className={`mt-1 ${draggedDemo ? 'text-green-700 font-medium' : 'text-gray-300'}`}>
              {draggedDemo ? '✨ Drop here' : 'Drop demo here'}
            </div>
            <div className={`text-xs mt-1 ${draggedDemo ? 'text-green-700' : 'text-green-600'}`}>
              📋 Auto-updates sheet
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            5×5 Grid Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Loading grid schedule...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              5×5 Grid Schedule
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadGridData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>Error: {error}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              Rows = Teams (1-5), Columns = Time Slots. Schedule data is automatically saved to Google Sheets.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="text-xs bg-green-50 border-green-200 p-3 rounded border">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-green-600">✅</div>
                  <strong className="text-green-800">Auto-Update Active:</strong>
                </div>
                <div className="text-green-700">
                  • Drop demo → Instantly updates Google Sheets notes<br/>
                  • Format: "Scheduled: Team X at TimeSlot (Grid: row,col)"<br/>
                  • Remove demo → Clears scheduling from sheets
                </div>
              </div>
              
              <div className="text-xs bg-blue-50 border-blue-200 p-3 rounded border">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-blue-600">📊</div>
                  <strong className="text-blue-800">Grid Coordinate System:</strong>
                </div>
                <div className="text-blue-700">
                  • (1,1) = Team 1, 9-11 AM | (1,5) = Team 1, 5-7 PM<br/>
                  • (5,1) = Team 5, 9-11 AM | (5,5) = Team 5, 5-7 PM<br/>
                  • Easy mapping: (Team#, TimeSlot#) format
                </div>
              </div>
            </div>
          </div>
          
          {/* Grid with headers */}
          <div className="grid grid-cols-6 gap-2 mb-6">
            {/* Top header - Time slots */}
            <div className="text-center"></div>
            {['9-11 AM', '11-1 PM', '1-3 PM', '3-5 PM', '5-7 PM'].map((timeLabel, colIndex) => (
              <div key={`time-${colIndex}`} className="text-xs font-medium text-center p-2 bg-blue-50 rounded">
                {timeLabel}
              </div>
            ))}
            
            {/* Grid cells with team labels */}
            {Array.from({ length: GRID_SIZE }, (_, rowIndex) => [
              // Team label
              <div key={`team-${rowIndex}`} className="text-xs font-medium text-center p-2 bg-green-50 rounded flex items-center justify-center">
                Team {rowIndex + 1}
              </div>,
              // Grid cells for this row
              ...Array.from({ length: GRID_SIZE }, (_, colIndex) => 
                renderGridCell(rowIndex, colIndex)
              )
            ]).flat()}
          </div>
        </CardContent>
      </Card>

      {/* Available Demos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Available Demos ({availableDemos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableDemos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No demos available for scheduling</p>
              <p className="text-sm">All planned demos are either placed on the grid or completed</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableDemos.map((demo) => (
                <div
                  key={demo.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, demo)}
                  className="border rounded-lg p-3 cursor-move hover:shadow-md transition-shadow bg-white"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm">{demo.clientName}</h4>
                      <Badge className={`${getStatusColor(demo.leadStatus)} text-xs`}>
                        {demo.leadStatus.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(demo.demoDate)}
                      </div>
                      {demo.demoTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {demo.demoTime}
                        </div>
                      )}
                      {demo.assignee && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {demo.assignee}
                        </div>
                      )}
                    </div>
                    
                    {demo.recipes.length > 0 && (
                      <div className="text-xs text-blue-600">
                        {demo.recipes.length} recipe{demo.recipes.length === 1 ? '' : 's'}: {demo.recipes.slice(0, 2).join(', ')}
                        {demo.recipes.length > 2 && '...'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}