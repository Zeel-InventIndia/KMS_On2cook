import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Calendar as CalendarComponent } from "./ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Calendar,
  Clock,
  Users,
  Plus,
  RefreshCw,
  AlertCircle,
  Eye,
  ChefHat,
  User as UserIcon,
  Filter,
  BarChart3,
  CalendarIcon,
  Settings,
} from "lucide-react";
import {
  User,
  DemoRequest,
  Task,
  TEAM_GROUPS,
  TIME_SLOTS,
  formatDateSafely,
} from "../App";
import { RecipeRepositoryFromSheets } from "./RecipeRepositoryFromSheets";
import { DemoDetailModal } from "./DemoDetailModal";
import { CreateTaskModal } from "./CreateTaskModal";
import { CreateKitchenRequestModal } from "./CreateKitchenRequestModal";
import { TeamManagement } from "./teams/TeamManagement";
import {
  assignTeamMember,
  assignAllTeamMembers,
  getTeamAssignmentInfo,
} from "../utils/teamMemberAssignment";
import { DemoCard } from "./DemoCard";

interface UnifiedDashboardProps {
  user: User;
  demoRequests: DemoRequest[];
  allDemoRequests: DemoRequest[];
  tasks: Task[];
  onUpdateDemoRequest: (request: DemoRequest) => void;
  onUpdateTask?: (task: Task) => void;
  onAddTask?: (task: Task) => void;
  onAddDemoRequest?: (request: DemoRequest) => void;
  onLogout: () => void;
  onRefreshSheets?: () => void;
  isLoadingSheets?: boolean;
  lastSheetsUpdate?: string | null;
  dataSource?: "csv" | "csv-client" | "mock";
  csvError?: string | null;
  onShowReporting?: () => void;
}

export function UnifiedDashboard({
  user,
  demoRequests,
  allDemoRequests,
  tasks,
  onUpdateDemoRequest,
  onUpdateTask,
  onAddTask,
  onAddDemoRequest,
  onLogout,
  onRefreshSheets,
  isLoadingSheets = false,
  lastSheetsUpdate,
  dataSource = "csv",
  csvError,
  onShowReporting,
}: UnifiedDashboardProps) {
  const [selectedDemo, setSelectedDemo] =
    useState<DemoRequest | null>(null);
  const [showDemoDetail, setShowDemoDetail] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateKitchenRequest, setShowCreateKitchenRequest] = useState(false);
  const [showTeamManagement, setShowTeamManagement] =
    useState(false);
  const [scheduleFilter, setScheduleFilter] =
    useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<
    Date | undefined
  >(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [draggedRequest, setDraggedRequest] =
    useState<DemoRequest | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    teamId: number;
    timeSlot: string;
  } | null>(null);
  const [savingToSheets, setSavingToSheets] = useState<
    string | null
  >(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(
    null,
  );

  // Helper function to check if demo can be scheduled today - Fixed timezone issues
  const canScheduleToday = (demoDate: string) => {
    const today = new Date();
    const todayFormatted = formatDateForComparison(today);
    return demoDate === todayFormatted;
  };

  // Helper function to check if demo date is in the past - Fixed timezone issues
  const isDemoDateExpired = (demoDate: string) => {
    const today = new Date();
    const todayFormatted = formatDateForComparison(today);
    return demoDate < todayFormatted;
  };

  // Helper function to check if demo date is in the future - Fixed timezone issues
  const isDemoDateFuture = (demoDate: string) => {
    const today = new Date();
    const todayFormatted = formatDateForComparison(today);
    return demoDate > todayFormatted;
  };

  // Helper function to get unique demo dates for filtering
  const getUniqueDates = () => {
    const dates = allDemoRequests.map((req) => req.demoDate);
    const uniqueDates = [...new Set(dates)].sort();
    return uniqueDates;
  };

  // Helper function to format date for comparison - Fixed timezone issues
  const formatDateForComparison = (date: Date) => {
    // Use local date to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper function to handle calendar date selection
  const handleCalendarDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const formattedDate = formatDateForComparison(date);
      console.log("📅 Date Selection Debug:", {
        selectedDate: date,
        formattedDate: formattedDate,
        localeDateString: date.toLocaleDateString(),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
      });
      setDateFilter(formattedDate);
    } else {
      setDateFilter("all");
    }
    setShowCalendar(false); // Close calendar after selection
  };

  // Helper function to clear date selection
  const clearDateSelection = () => {
    setSelectedDate(undefined);
    setDateFilter("all");
  };

  // Helper function to get dates that have demos for calendar highlighting - Fixed timezone issues
  const getDemoDateObjects = () => {
    return getUniqueDates().map((dateStr) => {
      // Parse the date string (YYYY-MM-DD) correctly to avoid timezone issues
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
    });
  };

  // Get unassigned requests - include rescheduled and cancelled demos
  const getUnassignedRequests = () => {
    console.log('🔍 UNASSIGNED DEBUG - getUnassignedRequests called');
    console.log('🔍 UNASSIGNED DEBUG - Total allDemoRequests:', allDemoRequests.length);
    console.log('🔍 UNASSIGNED DEBUG - Current user role:', user.role);
    
    let filtered = allDemoRequests.filter((req) => {
      // Show rescheduled demos back in unassigned with updated info (only if not reassigned)
      if (req.leadStatus === "demo_rescheduled") {
        const shouldShow = !req.assignedTeam;
        console.log(`🔍 UNASSIGNED DEBUG - Rescheduled demo ${req.clientName}: assignedTeam=${req.assignedTeam}, shouldShow=${shouldShow}`);
        return shouldShow;
      }

      // Show cancelled demos in unassigned for visibility only (not reassignment)
      if (req.leadStatus === "demo_cancelled") {
        const shouldShow = !req.assignedTeam; // Only show if not already assigned - for visibility only
        console.log(`🔍 UNASSIGNED DEBUG - Cancelled demo ${req.clientName}: assignedTeam=${req.assignedTeam}, shouldShow=${shouldShow}`);
        return shouldShow;
      }

      // Regular unassigned demos - show based on role and recipe status
      const isPlanned = req.leadStatus === "demo_planned";
      const notAssigned = !req.assignedTeam;
      const hasRecipes = req.recipes && req.recipes.length > 0;

      console.log(`🔍 UNASSIGNED DEBUG - Planned demo ${req.clientName}:`, {
        isPlanned,
        notAssigned,
        hasRecipes,
        assignee: req.assignee,
        userRole: user.role
      });

      // For presales team - show their assigned demos even without recipes so they can add recipes
      if (user.role === "presales") {
        const isAssignedToCurrentUser =
          req.assignee === user.name.toLowerCase();
        const shouldShow = isPlanned && notAssigned && isAssignedToCurrentUser;
        console.log(`🔍 UNASSIGNED DEBUG - Presales filter for ${req.clientName}: shouldShow=${shouldShow}`);
        return shouldShow;
      }

      // For non-presales roles - only show demos that have recipes (added by presales team)
      const shouldShow = isPlanned && notAssigned && hasRecipes;
      console.log(`🔍 UNASSIGNED DEBUG - Non-presales filter for ${req.clientName}: shouldShow=${shouldShow}`);
      return shouldShow;
    });

    // Apply date filter
    if (dateFilter !== "all") {
      console.log("📅 Filtering Debug:", {
        dateFilter: dateFilter,
        totalRequestsBefore: filtered.length,
        sampleDemoDates: filtered
          .slice(0, 3)
          .map((req) => req.demoDate),
        matchingRequests: filtered.filter(
          (req) => req.demoDate === dateFilter,
        ).length,
      });
      filtered = filtered.filter(
        (req) => req.demoDate === dateFilter,
      );
      console.log(
        "📅 After filtering:",
        filtered.length,
        "requests",
      );
    }

    // Sort by date
    filtered = filtered.sort(
      (a, b) =>
        new Date(a.demoDate).getTime() -
        new Date(b.demoDate).getTime(),
    );

    return filtered;
  };

  const unassignedRequests = getUnassignedRequests();

  // Get ALL assigned requests for schedule - ALWAYS include both demo_planned and demo_given
  const getAllAssignedRequests = () => {
    console.log('🔍 SCHEDULE DEBUG - getAllAssignedRequests called');
    console.log('🔍 SCHEDULE DEBUG - Total allDemoRequests:', allDemoRequests.length);
    console.log('🔍 SCHEDULE DEBUG - All demo requests with basic info:', allDemoRequests.map(req => ({
      name: req.clientName,
      assignedTeam: req.assignedTeam,
      assignedSlot: req.assignedSlot,
      leadStatus: req.leadStatus,
      assignedMembers: req.assignedMembers || [],
      hasTeam: Boolean(req.assignedTeam),
      hasSlot: Boolean(req.assignedSlot)
    })));
    
    const assignedRequests = allDemoRequests.filter(
      (req) => {
        const hasAssignedTeam = Boolean(req.assignedTeam);
        const hasValidStatus = [
          "demo_planned",
          "demo_rescheduled",
          "demo_given",
        ].includes(req.leadStatus);
        
        const isAssigned = hasAssignedTeam && hasValidStatus;
        
        console.log(`🔍 SCHEDULE DEBUG - Checking ${req.clientName}:`, {
          hasAssignedTeam,
          assignedTeam: req.assignedTeam,
          hasValidStatus,
          leadStatus: req.leadStatus,
          isAssigned,
          assignedSlot: req.assignedSlot,
          assignedMembers: req.assignedMembers || []
        });
        
        if (isAssigned) {
          console.log(`✅ SCHEDULE DEBUG - ASSIGNED: ${req.clientName} - Team: ${req.assignedTeam}, Status: ${req.leadStatus}, Slot: ${req.assignedSlot}, Members: ${req.assignedMembers?.join(', ') || 'none'}`);
        } else if (hasAssignedTeam) {
          console.log(`❌ SCHEDULE DEBUG - HAS TEAM BUT INVALID STATUS: ${req.clientName} - Team: ${req.assignedTeam}, Status: ${req.leadStatus}`);
        } else if (hasValidStatus) {
          console.log(`❌ SCHEDULE DEBUG - HAS VALID STATUS BUT NO TEAM: ${req.clientName} - Status: ${req.leadStatus}`);
        }
        
        return isAssigned;
      }
    );
    
    console.log('🔍 SCHEDULE DEBUG - Total assigned requests:', assignedRequests.length);
    console.log('🔍 SCHEDULE DEBUG - Assigned requests summary:', assignedRequests.map(req => ({
      name: req.clientName,
      team: req.assignedTeam,
      slot: req.assignedSlot,
      status: req.leadStatus
    })));
    
    return assignedRequests;
  };

  const allAssignedRequests = getAllAssignedRequests();

  // Filter schedule based on selected filter - but ALWAYS show both demo_planned and demo_given
  const getFilteredSchedule = () => {
    console.log('🔍 SCHEDULE FILTER DEBUG - getFilteredSchedule called');
    console.log('🔍 SCHEDULE FILTER DEBUG - scheduleFilter:', scheduleFilter);
    console.log('🔍 SCHEDULE FILTER DEBUG - allAssignedRequests count:', allAssignedRequests.length);
    console.log('🔍 SCHEDULE FILTER DEBUG - user.name:', user.name);
    
    let filtered;
    
    switch (scheduleFilter) {
      case "my_demos":
        // Show only demos assigned to current user but include both planned and given
        filtered = allAssignedRequests.filter(
          (req) => req.assignee === user.name.toLowerCase(),
        );
        console.log('🔍 SCHEDULE FILTER DEBUG - my_demos filter result:', filtered.length);
        break;
      case "active_only":
        // Show only active demos (planned and rescheduled, exclude given)
        filtered = allAssignedRequests.filter((req) =>
          ["demo_planned", "demo_rescheduled"].includes(
            req.leadStatus,
          ),
        );
        console.log('🔍 SCHEDULE FILTER DEBUG - active_only filter result:', filtered.length);
        break;
      case "completed_only":
        // Show only completed demos
        filtered = allAssignedRequests.filter(
          (req) => req.leadStatus === "demo_given",
        );
        console.log('🔍 SCHEDULE FILTER DEBUG - completed_only filter result:', filtered.length);
        break;
      default:
        // Show ALL assigned demos - both planned and given
        filtered = allAssignedRequests;
        console.log('🔍 SCHEDULE FILTER DEBUG - default (all) filter result:', filtered.length);
        break;
    }
    
    console.log('🔍 SCHEDULE FILTER DEBUG - Final filtered demos:', filtered.map(req => ({
      name: req.clientName,
      team: req.assignedTeam,
      slot: req.assignedSlot,
      status: req.leadStatus,
      assignee: req.assignee
    })));
    
    return filtered;
  };

  const filteredSchedule = getFilteredSchedule();

  const handleViewDemo = (demo: DemoRequest) => {
    console.log("👁️ View Demo clicked:", demo.clientName);
    setSelectedDemo(demo);
    setShowDemoDetail(true);
  };

  const handleCreateTask = (taskData: Omit<Task, "id">) => {
    if (onAddTask) {
      const newTask: Task = {
        ...taskData,
        id: `manual-task-${Date.now()}`,
      };
      onAddTask(newTask);
    }
    setShowCreateTask(false);
  };

  // Kitchen request handler
  const handleCreateKitchenRequest = (request: DemoRequest) => {
    if (onAddDemoRequest) {
      console.log('🍳 Adding kitchen request to frontend:', request);
      onAddDemoRequest(request);
    }
    setShowCreateKitchenRequest(false);
  };

  // Drag and drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    demo: DemoRequest,
  ) => {
    if (user.role !== "head_chef") return;

    // Do NOT allow cancelled demos to be dragged
    if (demo.leadStatus === "demo_cancelled") {
      e.preventDefault();
      return;
    }

    // Allow rescheduled demos to be dragged regardless of date
    // For regular planned demos, only allow if scheduled for today
    const isRescheduled =
      demo.leadStatus === "demo_rescheduled";
    const canDragRegular =
      demo.leadStatus === "demo_planned" &&
      canScheduleToday(demo.demoDate);

    if (!isRescheduled && !canDragRegular) {
      e.preventDefault();
      return;
    }

    setDraggedRequest(demo);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (
    e: React.DragEvent,
    teamId: number,
    timeSlot: string,
  ) => {
    if (!draggedRequest || user.role !== "head_chef") return;

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget({ teamId, timeSlot });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (
    e: React.DragEvent,
    teamId: number,
    timeSlot: string,
  ) => {
    e.preventDefault();

    if (!draggedRequest || user.role !== "head_chef") return;

    // Check if the slot is already occupied
    const existingDemo = getAssignedDemo(teamId, timeSlot);
    if (existingDemo) {
      console.log("Slot already occupied");
      setDraggedRequest(null);
      setDropTarget(null);
      return;
    }

    // Assign ALL team members for complete team assignment
    const assignedMembers = assignAllTeamMembers(teamId);

    // Show saving indicator with team member info
    const saveMessage =
      assignedMembers.length > 0
        ? `Saving ${draggedRequest.clientName} assignment to ${assignedMembers.join(", ")} (Team ${teamId}) - Google Sheets...`
        : `Saving ${draggedRequest.clientName} assignment to Team ${teamId} - Google Sheets...`;
    setSavingToSheets(saveMessage);

    // Update the demo request with team, slot, and ALL member assignments
    // If it was rescheduled, change status back to planned when reassigned
    const updatedRequest = {
      ...draggedRequest,
      assignedTeam: teamId,
      assignedSlot: timeSlot,
      assignedMembers: assignedMembers, // Now assigns ALL team members
      assignedMember: assignedMembers[0] || null, // Keep first member for backward compatibility
      leadStatus:
        draggedRequest.leadStatus === "demo_rescheduled"
          ? "demo_planned"
          : draggedRequest.leadStatus, // Reset to planned when reassigning rescheduled demos
    };

    try {
      onUpdateDemoRequest(updatedRequest);

      // Show success message with team member info
      const successMessage =
        assignedMembers.length > 0
          ? `✅ ${draggedRequest.clientName} assigned to ${assignedMembers.join(", ")} (Team ${teamId}), ${timeSlot} slot`
          : `✅ ${draggedRequest.clientName} assigned to Team ${teamId}, ${timeSlot} slot`;
      setSaveSuccess(successMessage);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      console.error("Failed to assign team:", error);
      // You could add error state here if needed
    } finally {
      setSavingToSheets(null);
      setDraggedRequest(null);
      setDropTarget(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedRequest(null);
    setDropTarget(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "demo_planned":
        return "bg-green-100 text-green-800 border-green-200";
      case "demo_rescheduled":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "demo_cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      case "demo_given":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateSafely(dateString, dateString);
  };

  // Helper function to get assigned demo for a specific team and time slot
  const getAssignedDemo = (
    teamId: number,
    timeSlot: string,
  ) => {
    const demo = filteredSchedule.find(
      (req) =>
        req.assignedTeam === teamId &&
        req.assignedSlot === timeSlot,
    );
    
    if (demo) {
      console.log(`🔍 SCHEDULE SLOT DEBUG - Found demo for Team ${teamId}, Slot "${timeSlot}":`, {
        name: demo.clientName,
        status: demo.leadStatus,
        assignedMembers: demo.assignedMembers
      });
    }
    
    return demo;
  };

  // Get display label for demo status
  const getStatusDisplayLabel = (demo: DemoRequest) => {
    if (demo.leadStatus === "demo_rescheduled") {
      return "Rescheduled Demo";
    }
    if (demo.leadStatus === "demo_cancelled") {
      return "Demo Cancelled";
    }
    if (demo.leadStatus === "demo_given") {
      return "Demo Given ✓";
    }
    return demo.leadStatus.replace("_", " ");
  };

  const getDashboardTitle = () => {
    switch (user.role) {
      case "head_chef":
        return "Head Chef Dashboard";
      case "presales":
        return "Presales Dashboard";
      case "sales":
        return "Sales Dashboard";
      case "culinary_team":
        return "Kitchen Team Dashboard";
      default:
        return "Dashboard";
    }
  };

  const getDashboardSubtitle = () => {
    switch (user.role) {
      case "head_chef":
        return "Kitchen Operations Manager";
      case "presales":
        return "Demo Planning & Recipe Management";
      case "sales":
        return "Sales Operations & Demo Tracking";
      case "culinary_team":
        return `Kitchen Team Member - Team ${user.team || "Unassigned"}`;
      default:
        return "Team Member";
    }
  };

  // Count statistics for display
  const scheduleStats = {
    total: allAssignedRequests.length,
    planned: allAssignedRequests.filter(
      (req) => req.leadStatus === "demo_planned",
    ).length,
    given: allAssignedRequests.filter(
      (req) => req.leadStatus === "demo_given",
    ).length,
    myDemos: allAssignedRequests.filter(
      (req) => req.assignee === user.name.toLowerCase(),
    ).length,
  };

  return (
    <>
      {/* Save Status Notifications */}
      {(savingToSheets || saveSuccess) && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {savingToSheets && (
            <div className="bg-blue-100 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="font-medium">
                {savingToSheets}
              </span>
            </div>
          )}
          {saveSuccess && (
            <div className="bg-green-100 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="font-medium">{saveSuccess}</span>
            </div>
          )}
        </div>
      )}

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">
                  {getDashboardTitle()}
                </h1>
                <p className="text-muted-foreground">
                  Welcome back, {user.name} •{" "}
                  {getDashboardSubtitle()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-sm">
                  <div className="font-medium">
                    Data Source:{" "}
                    {dataSource === "mock"
                      ? "Demo Mode"
                      : "Google Sheets"}
                    {dataSource === "mock" ? (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        DEMO
                      </span>
                    ) : (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        LIVE
                      </span>
                    )}
                  </div>
                  {lastSheetsUpdate && (
                    <div className="text-muted-foreground">
                      Updated:{" "}
                      {new Date(
                        lastSheetsUpdate,
                      ).toLocaleTimeString()}
                    </div>
                  )}
                  {dataSource === "mock" && (
                    <div className="text-yellow-600 text-xs">
                      All features work with sample data
                    </div>
                  )}
                </div>
                {onRefreshSheets && (
                  <Button
                    variant="outline"
                    onClick={onRefreshSheets}
                    disabled={isLoadingSheets}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${isLoadingSheets ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                )}
                {onShowReporting && (
                  <Button
                    variant="outline"
                    onClick={onShowReporting}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Reports
                  </Button>
                )}
                {user.role === "head_chef" && (
                  <Button
                    variant="outline"
                    onClick={() => setShowTeamManagement(true)}
                    size="sm"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Teams
                  </Button>
                )}
                {user.role === "head_chef" && (
                  <Button
                    onClick={() => setShowCreateKitchenRequest(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Request
                  </Button>
                )}
                <Button variant="outline" onClick={onLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Google Sheets Access Error Banner */}
        {csvError && dataSource === "mock" && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="container mx-auto">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Demo Mode:</strong> {csvError}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    All functionality works normally with sample
                    data. Click "Refresh" to retry connecting to
                    Google Sheets.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Two Horizontal Halves Layout */}
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-6 h-[calc(100vh-200px)]">
            {/* Top Half - Unassigned/Pending Requests */}
            <div className="h-1/2">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      {user.role === "presales"
                        ? `My Demo Requests (${unassignedRequests.length}) - Add Recipes & Ready for Assignment`
                        : `Ready for Assignment (${unassignedRequests.length}) - Demos with Recipes Added`}
                      {user.role === "head_chef" &&
                        unassignedRequests.length > 0 && (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200 text-xs"
                          >
                            ⤵️ Drag to Schedule (Today's Demos +
                            Rescheduled)
                          </Badge>
                        )}
                    </CardTitle>

                    {/* Simple Date Filter */}
                    <div className="flex items-center gap-3">
                      {selectedDate && (
                        <div className="text-sm bg-green-50 text-green-800 px-3 py-2 rounded border border-green-200">
                          📅{" "}
                          {formatDate(
                            formatDateForComparison(
                              selectedDate,
                            ),
                          )}
                          {canScheduleToday(
                            formatDateForComparison(
                              selectedDate,
                            ),
                          ) && (
                            <span className="ml-1 text-xs">
                              (Today)
                            </span>
                          )}
                          <div className="text-xs mt-1">
                            {
                              allDemoRequests.filter(
                                (req) =>
                                  req.demoDate ===
                                  formatDateForComparison(
                                    selectedDate,
                                  ),
                              ).length
                            }{" "}
                            demo(s) on this date
                          </div>
                        </div>
                      )}

                      <Popover
                        open={showCalendar}
                        onOpenChange={setShowCalendar}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={
                              selectedDate
                                ? "bg-green-50 border-green-200 text-green-800"
                                : ""
                            }
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate
                              ? "Change Date"
                              : "Select Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-auto p-0"
                          align="end"
                        >
                          <CalendarComponent
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleCalendarDateSelect}
                            modifiers={{
                              hasDemo: getDemoDateObjects(),
                            }}
                            modifiersStyles={{
                              hasDemo: {
                                backgroundColor:
                                  "rgba(34, 197, 94, 0.1)",
                                color: "rgb(34, 197, 94)",
                                fontWeight: "500",
                              },
                            }}
                            initialFocus
                          />
                          <div className="p-3 border-t space-y-2">
                            <div className="text-xs text-center text-muted-foreground">
                              💡 Green dates have demos
                            </div>
                            {selectedDate && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  clearDateSelection();
                                  setShowCalendar(false);
                                }}
                                className="w-full"
                              >
                                Show All Dates
                              </Button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  {unassignedRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      {user.role === "presales" ? (
                        <>
                          <p>
                            No demo requests assigned to you
                          </p>
                          <p className="text-sm">
                            You have no pending demos to add
                            recipes to
                          </p>
                        </>
                      ) : (
                        <>
                          <p>
                            No requests ready for assignment
                          </p>
                          <p className="text-sm">
                            All demos with recipes have been
                            assigned to teams
                          </p>
                          {user.role === "head_chef" && (
                            <p className="text-xs mt-2 text-blue-600">
                              💡 Demos appear here after
                              presales team adds recipes
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {unassignedRequests.map((demo) => {
                        // Allow dragging for head chef if:
                        // 1. It's a rescheduled demo (can be reassigned any time) - NOT cancelled
                        // 2. It's a planned demo scheduled for today
                        const isRescheduled =
                          demo.leadStatus ===
                          "demo_rescheduled";
                        const isCancelled =
                          demo.leadStatus === "demo_cancelled";
                        const isToday = canScheduleToday(
                          demo.demoDate,
                        );
                        const canDragRegular =
                          demo.leadStatus === "demo_planned" &&
                          isToday;
                        const canDrag =
                          user.role === "head_chef" &&
                          !isCancelled &&
                          (isRescheduled || canDragRegular);

                        return (
                          <div
                            key={demo.id}
                            draggable={canDrag}
                            onDragStart={(e) =>
                              handleDragStart(e, demo)
                            }
                            onDragEnd={handleDragEnd}
                            className={`border rounded-lg p-4 space-y-3 bg-white hover:shadow-md transition-shadow ${
                              canDrag ? "cursor-move" : ""
                            } ${draggedRequest?.id === demo.id ? "opacity-50" : ""} ${
                              !isToday &&
                              !isRescheduled &&
                              !isCancelled &&
                              user.role === "head_chef"
                                ? "opacity-60 border-dashed"
                                : ""
                            } ${
                              isRescheduled
                                ? "border-2 border-yellow-300 bg-yellow-50"
                                : ""
                            } ${
                              isCancelled
                                ? "border-2 border-red-300 bg-red-50 opacity-75"
                                : ""
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <h4 className="font-medium">
                                  {demo.clientName}
                                </h4>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(demo.demoDate)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {demo.demoTime}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge
                                  className={getStatusColor(
                                    demo.leadStatus,
                                  )}
                                >
                                  {getStatusDisplayLabel(demo)}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleViewDemo(demo)
                                  }
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">
                                <strong>Assignee:</strong>{" "}
                                {demo.assignee}
                              </p>
                              {demo.salesRep && (
                                <p className="text-sm text-muted-foreground">
                                  <strong>Sales Rep:</strong>{" "}
                                  {demo.salesRep}
                                </p>
                              )}
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">
                                  <strong>
                                    Recipes (
                                    {demo.recipes.length}):
                                  </strong>
                                </p>
                                {demo.recipes.length === 0 ? (
                                  <div className="text-sm bg-amber-50 text-amber-700 p-2 rounded border border-amber-200">
                                    {user.role === "presales" &&
                                    demo.assignee ===
                                      user.name.toLowerCase() ? (
                                      <>
                                        <strong>
                                          ⚠️ Action Required:
                                        </strong>{" "}
                                        Add recipes to make this
                                        demo available for team
                                        assignment.
                                      </>
                                    ) : (
                                      <>
                                        <strong>
                                          ⏳ Pending:
                                        </strong>{" "}
                                        Waiting for presales
                                        team to add recipes.
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {demo.recipes.map(
                                      (recipe, index) => (
                                        <Badge
                                          key={index}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {recipe}
                                        </Badge>
                                      ),
                                    )}
                                  </div>
                                )}
                              </div>
                              {demo.notes && (
                                <p className="text-sm text-muted-foreground">
                                  <strong>Notes:</strong>{" "}
                                  {demo.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bottom Half - Schedule and Repository */}
            <div className="h-1/2">
              <Tabs
                defaultValue="schedule"
                className="h-full flex flex-col"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="schedule">
                    Kitchen Schedule
                  </TabsTrigger>
                  <TabsTrigger value="recipes">
                    Recipe Repository
                  </TabsTrigger>
                </TabsList>

                {/* Kitchen Schedule Tab */}
                <TabsContent
                  value="schedule"
                  className="flex-1 mt-4"
                >
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Kitchen Schedule - Time vs Teams
                            {user.role === "head_chef" && (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                              >
                                🎯 Drag & Drop Enabled
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="text-sm text-muted-foreground">
                            Showing: {filteredSchedule.length}{" "}
                            of {scheduleStats.total} total (
                            {scheduleStats.planned} planned +{" "}
                            {scheduleStats.given} completed)
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <select
                            value={scheduleFilter}
                            onChange={(e) =>
                              setScheduleFilter(e.target.value)
                            }
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="all">
                              All Demos (Planned + Completed)
                            </option>
                            <option value="my_demos">
                              My Assigned Demos (
                              {scheduleStats.myDemos})
                            </option>
                            <option value="active_only">
                              Active Demos Only (
                              {scheduleStats.planned})
                            </option>
                            <option value="completed_only">
                              Completed Demos Only (
                              {scheduleStats.given})
                            </option>
                          </select>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left p-3 font-medium text-sm">
                                Time Slot
                              </th>
                              {TEAM_GROUPS.map((team) => (
                                <th
                                  key={team.id}
                                  className="text-center p-3 font-medium text-sm border-l"
                                >
                                  <div className="flex items-center justify-center gap-2">
                                    <span>{team.name}</span>
                                    {user.role ===
                                      "head_chef" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setShowTeamManagement(
                                            true,
                                          )
                                        }
                                        className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
                                      >
                                        <Settings className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-normal mt-1">
                                    {team.members.join(", ")}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {TIME_SLOTS.map(
                              (timeSlot, timeIndex) => (
                                <tr
                                  key={timeSlot}
                                  className={
                                    timeIndex % 2 === 0
                                      ? "bg-background"
                                      : "bg-muted/20"
                                  }
                                >
                                  <td className="p-3 font-medium text-sm border-r">
                                    {timeSlot}
                                  </td>
                                  {TEAM_GROUPS.map((team) => {
                                    const assignedDemo =
                                      getAssignedDemo(
                                        team.id,
                                        timeSlot,
                                      );
                                    const isDropTarget =
                                      dropTarget?.teamId ===
                                        team.id &&
                                      dropTarget?.timeSlot ===
                                        timeSlot;
                                    const dragCanDrop =
                                      !assignedDemo &&
                                      draggedRequest;

                                    return (
                                      <td
                                        key={team.id}
                                        className={`border-l p-2 text-center text-sm ${
                                          isDropTarget
                                            ? "bg-blue-100 border-blue-300"
                                            : assignedDemo
                                              ? "bg-green-50"
                                              : "hover:bg-gray-50"
                                        } ${
                                          user.role ===
                                            "head_chef" &&
                                          dragCanDrop
                                            ? "cursor-pointer"
                                            : ""
                                        }`}
                                        onDragOver={(e) =>
                                          handleDragOver(
                                            e,
                                            team.id,
                                            timeSlot,
                                          )
                                        }
                                        onDragLeave={
                                          handleDragLeave
                                        }
                                        onDrop={(e) =>
                                          handleDrop(
                                            e,
                                            team.id,
                                            timeSlot,
                                          )
                                        }
                                      >
                                        {assignedDemo ? (
                                          <div className="space-y-1">
                                            <div className="font-medium text-xs">
                                              {
                                                assignedDemo.clientName
                                              }
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {formatDate(
                                                assignedDemo.demoDate,
                                              )}
                                            </div>
                                            <Badge
                                              className={`${getStatusColor(assignedDemo.leadStatus)} text-xs px-1 py-0`}
                                            >
                                              {assignedDemo.leadStatus ===
                                              "demo_given"
                                                ? "✓ Done"
                                                : assignedDemo.leadStatus ===
                                                    "demo_planned"
                                                  ? "● Planned"
                                                  : assignedDemo.leadStatus ===
                                                      "demo_rescheduled"
                                                    ? "⚠ Rescheduled"
                                                    : assignedDemo.leadStatus}
                                            </Badge>
                                            <div className="mt-1">
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                  handleViewDemo(
                                                    assignedDemo,
                                                  )
                                                }
                                                className="h-6 text-xs px-2"
                                              >
                                                <Eye className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-xs text-muted-foreground py-4">
                                            {user.role ===
                                              "head_chef" &&
                                            draggedRequest &&
                                            dragCanDrop ? (
                                              <div className="text-blue-600 font-medium">
                                                📍 Drop Here
                                              </div>
                                            ) : (
                                              "Available"
                                            )}
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Recipe Repository Tab */}
                <TabsContent
                  value="recipes"
                  className="flex-1 mt-4"
                >
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ChefHat className="h-5 w-5" />
                        Recipe Repository
                        {user.role === "presales" && (
                          <Badge
                            variant="outline"
                            className="bg-purple-50 text-purple-700 border-purple-200 text-xs"
                          >
                            🍳 Add recipes to demos
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                      <RecipeRepositoryFromSheets user={user} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showDemoDetail && selectedDemo && (
          <DemoDetailModal
            demo={selectedDemo}
            isOpen={showDemoDetail}
            onClose={() => setShowDemoDetail(false)}
            onUpdate={onUpdateDemoRequest}
            currentUser={user}
          />
        )}

        {showCreateTask && (
          <CreateTaskModal
            onClose={() => setShowCreateTask(false)}
            onCreate={handleCreateTask}
          />
        )}

        {showTeamManagement && user.role === "head_chef" && (
          <TeamManagement
            onClose={() => setShowTeamManagement(false)}
          />
        )}
      </div>
    </>
  );
}