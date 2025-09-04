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
    let filtered = allDemoRequests.filter((req) => {
      // Show rescheduled demos back in unassigned with updated info
      if (req.leadStatus === "demo_rescheduled") {
        return !req.assignedTeam;
      }

      // Show cancelled demos in unassigned for visibility only (not reassignment)
      if (req.leadStatus === "demo_cancelled") {
        return !req.assignedTeam; // Only show if not already assigned - for visibility only
      }

      // Regular unassigned demos - only show for presales team if no recipes yet
      // For other roles, only show demos that have recipes added by presales team
      const isPlanned = req.leadStatus === "demo_planned";
      const notAssigned = !req.assignedTeam;
      const hasRecipes = req.recipes && req.recipes.length > 0;

      // For presales team - show their assigned demos even without recipes so they can add recipes
      if (user.role === "presales") {
        const isAssignedToCurrentUser =
          req.assignee === user.name.toLowerCase();
        return (
          isPlanned && notAssigned && isAssignedToCurrentUser
        );
      }

      // For non-presales roles - only show demos that have recipes (added by presales team)
      return isPlanned && notAssigned && hasRecipes;
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
    return allDemoRequests.filter(
      (req) =>
        req.assignedTeam &&
        [
          "demo_planned",
          "demo_rescheduled",
          "demo_given",
        ].includes(req.leadStatus),
    );
  };

  const allAssignedRequests = getAllAssignedRequests();

  // Filter schedule based on selected filter - but ALWAYS show both demo_planned and demo_given
  const getFilteredSchedule = () => {
    switch (scheduleFilter) {
      case "my_demos":
        // Show only demos assigned to current user but include both planned and given
        return allAssignedRequests.filter(
          (req) => req.assignee === user.name.toLowerCase(),
        );
      case "active_only":
        // Show only active demos (planned and rescheduled, exclude given)
        return allAssignedRequests.filter((req) =>
          ["demo_planned", "demo_rescheduled"].includes(
            req.leadStatus,
          ),
        );
      case "completed_only":
        // Show only completed demos
        return allAssignedRequests.filter(
          (req) => req.leadStatus === "demo_given",
        );
      default:
        // Show ALL assigned demos - both planned and given
        return allAssignedRequests;
    }
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
    return filteredSchedule.find(
      (req) =>
        req.assignedTeam === teamId &&
        req.assignedSlot === timeSlot,
    );
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
                <CardContent className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto pr-2">
                    {unassignedRequests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="text-muted-foreground mb-4">
                          {user.role === "presales" ? (
                            <>
                              <ChefHat className="h-12 w-12 mx-auto mb-2" />
                              <p className="text-lg font-medium">
                                No pending demo requests
                              </p>
                              <p className="text-sm">
                                New demo requests assigned to you will appear here
                              </p>
                            </>
                          ) : user.role === "head_chef" ? (
                            <>
                              <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                              <p className="text-lg font-medium">
                                All demos assigned or no demos with recipes
                              </p>
                              <p className="text-sm">
                                Demos appear here when presales team adds recipes
                              </p>
                            </>
                          ) : (
                            <>
                              <Users className="h-12 w-12 mx-auto mb-2" />
                              <p className="text-lg font-medium">
                                No demos ready for assignment
                              </p>
                              <p className="text-sm">
                                Demos with recipes added by presales team will appear here
                              </p>
                            </>
                          )}
                        </div>
                        {(user.role === "presales" || user.role === "head_chef") && (
                          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                            💡 {user.role === "presales" 
                              ? "You can add recipes to your assigned demos to make them ready for assignment"
                              : "Create new kitchen requests using the 'Create Request' button above"}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {unassignedRequests.map((request) => (
                          <div
                            key={request.id}
                            className={`
                              p-4 rounded-lg border-2 transition-all cursor-pointer
                              ${user.role === "head_chef" && 
                                request.leadStatus !== "demo_cancelled" && 
                                (canScheduleToday(request.demoDate) || request.leadStatus === "demo_rescheduled")
                                ? "hover:border-green-300 hover:shadow-lg drag-handle cursor-move"
                                : "hover:border-gray-300"
                              }
                              ${getStatusColor(request.leadStatus)}
                            `}
                            draggable={user.role === "head_chef" && 
                              request.leadStatus !== "demo_cancelled" && 
                              (canScheduleToday(request.demoDate) || request.leadStatus === "demo_rescheduled")
                            }
                            onDragStart={(e) => handleDragStart(e, request)}
                            onDragEnd={handleDragEnd}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold truncate">
                                    {request.clientName}
                                  </h3>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${getStatusColor(request.leadStatus)}`}
                                  >
                                    {getStatusDisplayLabel(request)}
                                  </Badge>
                                  {user.role === "head_chef" && 
                                    request.leadStatus !== "demo_cancelled" && 
                                    (canScheduleToday(request.demoDate) || request.leadStatus === "demo_rescheduled") && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs bg-green-100 text-green-800 border-green-200"
                                    >
                                      Draggable
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span>{formatDate(request.demoDate)}</span>
                                    {canScheduleToday(request.demoDate) && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-blue-50 text-blue-700 border-blue-200 ml-1"
                                      >
                                        Today
                                      </Badge>
                                    )}
                                    {isDemoDateExpired(request.demoDate) && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs bg-red-50 text-red-700 border-red-200 ml-1"
                                      >
                                        Expired
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>{request.demoTime}</span>
                                  </div>
                                </div>

                                {request.clientEmail && (
                                  <div className="text-sm text-muted-foreground mb-1">
                                    📧 {request.clientEmail}
                                  </div>
                                )}
                                
                                {request.clientMobile && (
                                  <div className="text-sm text-muted-foreground mb-2">
                                    📱 {request.clientMobile}
                                  </div>
                                )}

                                {request.assignee && (
                                  <div className="text-sm text-muted-foreground mb-1">
                                    👤 Assignee: {request.assignee}
                                  </div>
                                )}

                                {request.salesRep && (
                                  <div className="text-sm text-muted-foreground mb-1">
                                    💼 Sales Rep: {request.salesRep}
                                  </div>
                                )}

                                {request.recipes && request.recipes.length > 0 && (
                                  <div className="text-sm text-green-700 mb-2">
                                    🍳 {request.recipes.length} recipes added
                                  </div>
                                )}

                                {request.source === 'kitchen_request' && (
                                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                    Kitchen Request
                                  </Badge>
                                )}
                              </div>

                              <div className="ml-4 flex flex-col gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDemo(request)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </div>
                            </div>

                            {user.role === "head_chef" && 
                              request.leadStatus !== "demo_cancelled" && 
                              (canScheduleToday(request.demoDate) || request.leadStatus === "demo_rescheduled") && (
                              <div className="mt-3 pt-3 border-t border-dashed text-xs text-muted-foreground">
                                💡 Drag this demo to a time slot in the schedule below to assign a team
                              </div>
                            )}

                            {request.leadStatus === "demo_cancelled" && (
                              <div className="mt-3 pt-3 border-t border-dashed text-xs text-red-600">
                                ⚠️ This demo has been cancelled and cannot be reassigned
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Half - Kitchen Schedule */}
            <div className="h-1/2">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Kitchen Schedule ({filteredSchedule.length} assigned)
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {scheduleStats.planned} Planned
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {scheduleStats.given} Completed
                        </Badge>
                      </div>
                    </CardTitle>

                    {/* Schedule Filter */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Filter className="h-4 w-4" />
                        <select
                          value={scheduleFilter}
                          onChange={(e) => setScheduleFilter(e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="all">All Demos ({scheduleStats.total})</option>
                          <option value="my_demos">My Demos ({scheduleStats.myDemos})</option>
                          <option value="active_only">Active Only ({scheduleStats.planned})</option>
                          <option value="completed_only">Completed ({scheduleStats.given})</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  <div className="h-full overflow-auto">
                    {/* Team Headers */}
                    <div className="grid grid-cols-6 gap-4 mb-4">
                      <div className="font-semibold text-center p-2 bg-muted rounded">
                        Time Slots
                      </div>
                      {TEAM_GROUPS.map((team, index) => (
                        <div key={team.id} className="font-semibold text-center p-2 bg-muted rounded">
                          Team {team.id}
                          <div className="text-xs font-normal text-muted-foreground mt-1">
                            {team.members.join(", ")}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Schedule Grid */}
                    <div className="space-y-2">
                      {TIME_SLOTS.map((timeSlot) => (
                        <div key={timeSlot} className="grid grid-cols-6 gap-4">
                          {/* Time Slot Header */}
                          <div className="p-3 bg-muted/50 rounded text-center font-medium">
                            {timeSlot}
                          </div>

                          {/* Team Columns */}
                          {TEAM_GROUPS.map((team) => {
                            const assignedDemo = getAssignedDemo(team.id, timeSlot);
                            const isDropTarget = dropTarget?.teamId === team.id && dropTarget?.timeSlot === timeSlot;

                            return (
                              <div
                                key={`${team.id}-${timeSlot}`}
                                className={`
                                  min-h-[100px] p-3 rounded-lg border-2 border-dashed transition-all
                                  ${assignedDemo ? 'border-solid bg-card' : 'border-gray-200 bg-gray-50'}
                                  ${isDropTarget ? 'border-green-400 bg-green-50' : ''}
                                  ${!assignedDemo && user.role === 'head_chef' ? 'hover:border-green-300 hover:bg-green-50/50' : ''}
                                `}
                                onDragOver={(e) => handleDragOver(e, team.id, timeSlot)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, team.id, timeSlot)}
                              >
                                {assignedDemo ? (
                                  <div className="h-full">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="font-semibold text-sm truncate">
                                        {assignedDemo.clientName}
                                      </h4>
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${getStatusColor(assignedDemo.leadStatus)}`}
                                      >
                                        {getStatusDisplayLabel(assignedDemo)}
                                      </Badge>
                                    </div>
                                    
                                    <div className="space-y-1 text-xs text-muted-foreground">
                                      <div>📅 {formatDate(assignedDemo.demoDate)}</div>
                                      {assignedDemo.assignedMembers && assignedDemo.assignedMembers.length > 0 && (
                                        <div>👥 {assignedDemo.assignedMembers.join(", ")}</div>
                                      )}
                                      {assignedDemo.recipes && assignedDemo.recipes.length > 0 && (
                                        <div>🍳 {assignedDemo.recipes.length} recipes</div>
                                      )}
                                    </div>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full mt-2"
                                      onClick={() => handleViewDemo(assignedDemo)}
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      View
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="h-full flex items-center justify-center text-muted-foreground">
                                    {user.role === 'head_chef' ? (
                                      <div className="text-center">
                                        <div className="text-xs mb-1">Drop zone</div>
                                        <div className="text-xs">Team {team.id}</div>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-center">No demo assigned</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
          isOpen={showCreateTask}
          onClose={() => setShowCreateTask(false)}
          onCreate={handleCreateTask}
        />
      )}

      {showCreateKitchenRequest && (
        <CreateKitchenRequestModal
          open={showCreateKitchenRequest}
          onClose={() => setShowCreateKitchenRequest(false)}
          onCreateRequest={handleCreateKitchenRequest}
          user={user}
        />
      )}

      {showTeamManagement && (
        <TeamManagement
          isOpen={showTeamManagement}
          onClose={() => setShowTeamManagement(false)}
        />
      )}

      {user.role === "presales" && (
        <RecipeRepositoryFromSheets />
      )}
    </>
  );
}