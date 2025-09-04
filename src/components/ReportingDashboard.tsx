import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  Users,
  ChefHat,
  Download,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { User, DemoRequest, Task } from '../App';
import {
  calculateReportingMetrics,
  calculateDailyMetrics,
  calculateTeamMetrics,
  formatPeriodLabel,
  exportReportData,
  ReportingMetrics,
  TeamPerformance
} from '../utils/reportingHelpers';

interface ReportingDashboardProps {
  user: User;
  demoRequests: DemoRequest[];
  tasks: Task[];
  onBack: () => void;
}

const CHART_COLORS = {
  planned: '#22c55e',
  given: '#3b82f6',
  rescheduled: '#f59e0b',
  cancelled: '#ef4444',
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#06b6d4'
};

export function ReportingDashboard({ user, demoRequests, tasks, onBack }: ReportingDashboardProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [periodOffset, setPeriodOffset] = useState(0);

  // Calculate metrics
  const metrics = useMemo(() => 
    calculateReportingMetrics(demoRequests, tasks, period, periodOffset),
    [demoRequests, tasks, period, periodOffset]
  );

  const dailyMetrics = useMemo(() => 
    calculateDailyMetrics(demoRequests, period, periodOffset),
    [demoRequests, period, periodOffset]
  );

  const teamMetrics = useMemo(() => 
    calculateTeamMetrics(demoRequests, period, periodOffset),
    [demoRequests, period, periodOffset]
  );

  const handleExport = () => {
    exportReportData(metrics, dailyMetrics);
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    setPeriodOffset(prev => direction === 'prev' ? prev - 1 : prev + 1);
  };

  const resetToCurrentPeriod = () => {
    setPeriodOffset(0);
  };

  // Prepare chart data
  const demoStatusData = [
    { name: 'Planned', value: metrics.demosPlanned, color: CHART_COLORS.planned },
    { name: 'Given', value: metrics.demosGiven, color: CHART_COLORS.given },
    { name: 'Rescheduled', value: metrics.demosRescheduled, color: CHART_COLORS.rescheduled },
    { name: 'Cancelled', value: metrics.demosCancelled, color: CHART_COLORS.cancelled }
  ].filter(item => item.value > 0);

  const operationalData = [
    { name: 'Recipes Created', value: metrics.recipesCreated, color: CHART_COLORS.primary },
    { name: 'Device Testing', value: metrics.deviceTesting, color: CHART_COLORS.secondary },
    { name: 'Video Shoots', value: metrics.videoShoots, color: CHART_COLORS.accent },
    { name: 'Events', value: metrics.events, color: CHART_COLORS.planned }
  ].filter(item => item.value > 0);

  const getCompletionRate = () => {
    return metrics.totalDemos > 0 ? Math.round((metrics.demosGiven / metrics.totalDemos) * 100) : 0;
  };

  const getTopPerformer = (team: TeamPerformance[]): TeamPerformance | null => {
    if (team.length === 0) return null;
    return team.reduce((top, current) => 
      current.demosCompleted > top.demosCompleted ? current : top
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-semibold">Executive Reporting</h1>
                <p className="text-muted-foreground">
                  Performance analytics and insights • {user.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Period Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigatePeriod('prev')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="text-center min-w-[200px]">
                <h2 className="font-semibold">{formatPeriodLabel(period, periodOffset)}</h2>
                {periodOffset !== 0 && (
                  <Button variant="link" size="sm" onClick={resetToCurrentPeriod} className="text-xs">
                    Return to current {period}
                  </Button>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => navigatePeriod('next')}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={period === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('week')}
            >
              Weekly
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('month')}
            >
              Monthly
            </Button>
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Demos</p>
                  <p className="text-2xl font-semibold">{metrics.totalDemos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-semibold">{getCompletionRate()}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ChefHat className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recipes Created</p>
                  <p className="text-2xl font-semibold">{metrics.recipesCreated}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Activity className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Activities</p>
                  <p className="text-2xl font-semibold">
                    {metrics.deviceTesting + metrics.videoShoots + metrics.events}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="demos">Demo Analytics</TabsTrigger>
            <TabsTrigger value="teams">Team Performance</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Demo Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5" />
                    Demo Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {demoStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={demoStatusData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {demoStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No demo data for this period
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Daily Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Daily Demo Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dailyMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="demosGiven" 
                        stackId="1" 
                        stroke={CHART_COLORS.given} 
                        fill={CHART_COLORS.given}
                        name="Demos Given"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="demosPlanned" 
                        stackId="1" 
                        stroke={CHART_COLORS.planned} 
                        fill={CHART_COLORS.planned}
                        name="Demos Planned"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-medium text-green-800">Top Presales Performer</h4>
                    {(() => {
                      const top = getTopPerformer(metrics.presalesPerformance);
                      return top ? (
                        <div className="mt-2">
                          <p className="font-semibold capitalize">{top.name}</p>
                          <p className="text-sm text-green-700">{top.demosCompleted} demos completed</p>
                          <p className="text-sm text-green-700">{top.recipesAdded || 0} recipes added</p>
                        </div>
                      ) : (
                        <p className="text-sm text-green-700 mt-2">No data available</p>
                      );
                    })()}
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800">Kitchen Performance</h4>
                    {(() => {
                      const top = getTopPerformer(metrics.kitchenPerformance);
                      return top ? (
                        <div className="mt-2">
                          <p className="font-semibold capitalize">{top.name}</p>
                          <p className="text-sm text-blue-700">{top.demosCompleted} demos completed</p>
                          <p className="text-sm text-blue-700">{top.completionRate}% completion rate</p>
                        </div>
                      ) : (
                        <p className="text-sm text-blue-700 mt-2">No data available</p>
                      );
                    })()}
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-800">Operational Highlights</h4>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-purple-700">{metrics.recipesCreated} recipes developed</p>
                      <p className="text-sm text-purple-700">{metrics.deviceTesting} device tests</p>
                      <p className="text-sm text-purple-700">{metrics.videoShoots} video shoots</p>
                      <p className="text-sm text-purple-700">{metrics.events} events completed</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Demo Analytics Tab */}
          <TabsContent value="demos" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Demo Performance by Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={teamMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="team" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="given" stackId="a" fill={CHART_COLORS.given} name="Given" />
                      <Bar dataKey="planned" stackId="a" fill={CHART_COLORS.planned} name="Planned" />
                      <Bar dataKey="rescheduled" stackId="a" fill={CHART_COLORS.rescheduled} name="Rescheduled" />
                      <Bar dataKey="cancelled" stackId="a" fill={CHART_COLORS.cancelled} name="Cancelled" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Demo Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span className="font-medium">Demos Given</span>
                      </div>
                      <Badge variant="secondary">{metrics.demosGiven}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span className="font-medium">Demos Planned</span>
                      </div>
                      <Badge variant="secondary">{metrics.demosPlanned}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                        <span className="font-medium">Demos Rescheduled</span>
                      </div>
                      <Badge variant="secondary">{metrics.demosRescheduled}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-red-500 rounded"></div>
                        <span className="font-medium">Demos Cancelled</span>
                      </div>
                      <Badge variant="secondary">{metrics.demosCancelled}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Team Performance Tab */}
          <TabsContent value="teams" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Presales Team */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Presales Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.presalesPerformance.map((member) => (
                      <div key={member.name} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium capitalize">{member.name}</h4>
                          <Badge variant="outline">{member.completionRate}%</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Demos: {member.demosCompleted}/{member.demosAssigned}</p>
                          <p>Recipes Added: {member.recipesAdded || 0}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sales Team */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Sales Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.salesPerformance.map((member) => (
                      <div key={member.name} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium capitalize">{member.name}</h4>
                          <Badge variant="outline">{member.completionRate}%</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Demos: {member.demosCompleted}/{member.demosAssigned}</p>
                          <p>Tasks: {member.tasksCompleted || 0}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Kitchen Team */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5" />
                    Kitchen Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {metrics.kitchenPerformance.map((member) => (
                      <div key={member.name} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium capitalize">{member.name}</h4>
                          <Badge variant="outline">{member.completionRate}%</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Demos: {member.demosCompleted}/{member.demosAssigned}</p>
                          <p>Tasks: {member.tasksCompleted || 0}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Operations Tab */}
          <TabsContent value="operations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Operational Activities */}
              <Card>
                <CardHeader>
                  <CardTitle>Operational Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  {operationalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={operationalData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill={CHART_COLORS.primary} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No operational data for this period
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Activity Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div>
                        <h4 className="font-medium">Recipe Development</h4>
                        <p className="text-sm text-muted-foreground">New recipes created</p>
                      </div>
                      <Badge variant="secondary">{metrics.recipesCreated}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <h4 className="font-medium">Device Testing</h4>
                        <p className="text-sm text-muted-foreground">Equipment testing sessions</p>
                      </div>
                      <Badge variant="secondary">{metrics.deviceTesting}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <h4 className="font-medium">Video Production</h4>
                        <p className="text-sm text-muted-foreground">Video shoots completed</p>
                      </div>
                      <Badge variant="secondary">{metrics.videoShoots}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div>
                        <h4 className="font-medium">Events</h4>
                        <p className="text-sm text-muted-foreground">Events and exhibitions</p>
                      </div>
                      <Badge variant="secondary">{metrics.events}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}