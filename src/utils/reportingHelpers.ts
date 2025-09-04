import { DemoRequest, Task } from '../App';

export interface ReportingMetrics {
  // Demo metrics
  totalDemos: number;
  demosPlanned: number;
  demosGiven: number;
  demosRescheduled: number;
  demosCancelled: number;
  
  // Team performance
  presalesPerformance: TeamPerformance[];
  salesPerformance: TeamPerformance[];
  kitchenPerformance: TeamPerformance[];
  
  // Operational metrics
  recipesCreated: number;
  deviceTesting: number;
  videoShoots: number;
  events: number;
  
  // Time-based metrics
  period: 'week' | 'month';
  startDate: string;
  endDate: string;
}

export interface TeamPerformance {
  name: string;
  role: string;
  demosAssigned: number;
  demosCompleted: number;
  completionRate: number;
  recipesAdded?: number;
  tasksCompleted?: number;
}

export interface DailyMetric {
  date: string;
  demosPlanned: number;
  demosGiven: number;
  demosRescheduled: number;
  demosCancelled: number;
}

export interface TeamMetric {
  team: string;
  planned: number;
  given: number;
  rescheduled: number;
  cancelled: number;
}

export const calculateDateRange = (period: 'week' | 'month', offset: number = 0): { startDate: Date; endDate: Date } => {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (period === 'week') {
    // Get Monday of the current week
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate = new Date(now);
    startDate.setDate(now.getDate() + daysToMonday + (offset * 7));
    startDate.setHours(0, 0, 0, 0);
    
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // Get first day of the current month
    startDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
};

export const isDateInRange = (dateString: string, startDate: Date, endDate: Date): boolean => {
  const date = new Date(dateString);
  return date >= startDate && date <= endDate;
};

export const calculateReportingMetrics = (
  demoRequests: DemoRequest[],
  tasks: Task[],
  period: 'week' | 'month',
  offset: number = 0
): ReportingMetrics => {
  const { startDate, endDate } = calculateDateRange(period, offset);
  
  // Filter data for the period
  const filteredDemos = demoRequests.filter(demo => 
    isDateInRange(demo.demoDate, startDate, endDate)
  );
  
  const filteredTasks = tasks.filter(task => 
    isDateInRange(task.date, startDate, endDate)
  );

  // Calculate demo metrics
  const totalDemos = filteredDemos.length;
  const demosPlanned = filteredDemos.filter(d => d.leadStatus === 'demo_planned').length;
  const demosGiven = filteredDemos.filter(d => d.leadStatus === 'demo_given').length;
  const demosRescheduled = filteredDemos.filter(d => d.leadStatus === 'demo_rescheduled').length;
  const demosCancelled = filteredDemos.filter(d => d.leadStatus === 'demo_cancelled').length;

  // Calculate team performance
  const presalesTeam = ['madhuri', 'salim', 'ronit'];
  const salesTeam = ['sourabh', 'sapan', 'anmol'];
  const kitchenTeamMembers = ['manish', 'pran krishna', 'shahid', 'kishore', 'vikas', 'krishna', 'bikram', 'ganesh', 'prathimesh'];

  const calculateTeamPerformance = (teamMembers: string[], role: string): TeamPerformance[] => {
    return teamMembers.map(member => {
      const memberDemos = filteredDemos.filter(demo => 
        demo.assignee?.toLowerCase() === member.toLowerCase() ||
        demo.salesRep?.toLowerCase() === member.toLowerCase() ||
        demo.assignedMembers?.some(assignedMember => 
          assignedMember.toLowerCase() === member.toLowerCase()
        )
      );
      
      const assigned = memberDemos.length;
      const completed = memberDemos.filter(d => d.leadStatus === 'demo_given').length;
      const completionRate = assigned > 0 ? (completed / assigned) * 100 : 0;
      
      // Count recipes added (for presales)
      const recipesAdded = role === 'presales' 
        ? memberDemos.reduce((sum, demo) => sum + (demo.recipes?.length || 0), 0)
        : undefined;

      // Count tasks completed
      const memberTasks = filteredTasks.filter(task => 
        task.assignedMembers?.some(assignedMember => 
          assignedMember.toLowerCase() === member.toLowerCase()
        ) || task.createdBy?.toLowerCase() === member.toLowerCase()
      );
      const tasksCompleted = memberTasks.filter(t => t.status === 'completed').length;

      return {
        name: member,
        role,
        demosAssigned: assigned,
        demosCompleted: completed,
        completionRate: Math.round(completionRate),
        recipesAdded,
        tasksCompleted
      };
    });
  };

  const presalesPerformance = calculateTeamPerformance(presalesTeam, 'presales');
  const salesPerformance = calculateTeamPerformance(salesTeam, 'sales');
  const kitchenPerformance = calculateTeamPerformance(kitchenTeamMembers, 'kitchen');

  // Calculate operational metrics
  const recipesCreated = filteredTasks.filter(t => t.type === 'recipe_development').length;
  const deviceTesting = filteredTasks.filter(t => t.type === 'device_testing').length;
  const videoShoots = filteredTasks.filter(t => t.type === 'videoshoot').length;
  const events = filteredTasks.filter(t => t.type === 'event').length;

  return {
    totalDemos,
    demosPlanned,
    demosGiven,
    demosRescheduled,
    demosCancelled,
    presalesPerformance,
    salesPerformance,
    kitchenPerformance,
    recipesCreated,
    deviceTesting,
    videoShoots,
    events,
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
};

export const calculateDailyMetrics = (
  demoRequests: DemoRequest[],
  period: 'week' | 'month',
  offset: number = 0
): DailyMetric[] => {
  const { startDate, endDate } = calculateDateRange(period, offset);
  const metrics: DailyMetric[] = [];
  
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const dayDemos = demoRequests.filter(demo => demo.demoDate === dateStr);
    
    metrics.push({
      date: dateStr,
      demosPlanned: dayDemos.filter(d => d.leadStatus === 'demo_planned').length,
      demosGiven: dayDemos.filter(d => d.leadStatus === 'demo_given').length,
      demosRescheduled: dayDemos.filter(d => d.leadStatus === 'demo_rescheduled').length,
      demosCancelled: dayDemos.filter(d => d.leadStatus === 'demo_cancelled').length,
    });
    
    current.setDate(current.getDate() + 1);
  }
  
  return metrics;
};

export const calculateTeamMetrics = (
  demoRequests: DemoRequest[],
  period: 'week' | 'month',
  offset: number = 0
): TeamMetric[] => {
  const { startDate, endDate } = calculateDateRange(period, offset);
  const filteredDemos = demoRequests.filter(demo => 
    isDateInRange(demo.demoDate, startDate, endDate)
  );

  const teams = [
    { name: 'Presales', members: ['madhuri', 'salim', 'ronit'] },
    { name: 'Sales', members: ['sourabh', 'sapan', 'anmol'] },
    { name: 'Kitchen Team 1', members: ['manish', 'pran krishna', 'shahid'] },
    { name: 'Kitchen Team 2', members: ['kishore', 'vikas', 'krishna'] },
    { name: 'Kitchen Team 3', members: ['bikram', 'ganesh', 'prathimesh'] }
  ];

  return teams.map(team => {
    const teamDemos = filteredDemos.filter(demo => 
      team.members.some(member => 
        demo.assignee?.toLowerCase() === member.toLowerCase() ||
        demo.salesRep?.toLowerCase() === member.toLowerCase() ||
        demo.assignedMembers?.some(assignedMember => 
          assignedMember.toLowerCase() === member.toLowerCase()
        )
      )
    );

    return {
      team: team.name,
      planned: teamDemos.filter(d => d.leadStatus === 'demo_planned').length,
      given: teamDemos.filter(d => d.leadStatus === 'demo_given').length,
      rescheduled: teamDemos.filter(d => d.leadStatus === 'demo_rescheduled').length,
      cancelled: teamDemos.filter(d => d.leadStatus === 'demo_cancelled').length,
    };
  });
};

export const formatPeriodLabel = (period: 'week' | 'month', offset: number = 0): string => {
  const { startDate, endDate } = calculateDateRange(period, offset);
  
  if (period === 'week') {
    const weekStart = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEnd = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `Week of ${weekStart} - ${weekEnd}`;
  } else {
    return startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
};

export const exportReportData = (metrics: ReportingMetrics, dailyMetrics: DailyMetric[]): void => {
  const reportData = {
    period: formatPeriodLabel(metrics.period),
    summary: {
      totalDemos: metrics.totalDemos,
      demosPlanned: metrics.demosPlanned,
      demosGiven: metrics.demosGiven,
      demosRescheduled: metrics.demosRescheduled,
      demosCancelled: metrics.demosCancelled,
      completionRate: metrics.totalDemos > 0 ? Math.round((metrics.demosGiven / metrics.totalDemos) * 100) : 0
    },
    operational: {
      recipesCreated: metrics.recipesCreated,
      deviceTesting: metrics.deviceTesting,
      videoShoots: metrics.videoShoots,
      events: metrics.events
    },
    teamPerformance: {
      presales: metrics.presalesPerformance,
      sales: metrics.salesPerformance,
      kitchen: metrics.kitchenPerformance
    },
    dailyBreakdown: dailyMetrics
  };

  const dataStr = JSON.stringify(reportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `on2cook-report-${metrics.period}-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
};