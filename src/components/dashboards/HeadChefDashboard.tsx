import { useState, useEffect } from 'react';
import { User } from '../../types/User';
import { Header } from '../common/Header';
import { SchedulingBoard } from '../scheduling/SchedulingBoard';
import { PendingRequests } from '../requests/PendingRequests';
import { TeamManagement } from '../teams/TeamManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Task, Team } from '../../types/Task';
import { mockTasks, mockTeams } from '../../data/mockData';

interface HeadChefDashboardProps {
  user: User;
  onLogout: () => void;
}

export function HeadChefDashboard({ user, onLogout }: HeadChefDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setTasks(mockTasks);
      setTeams(mockTeams);
      setLoading(false);
    }, 1000);
  }, []);

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
  };

  const handleTaskAssign = (taskId: string, teamId: number, memberIds: string[]) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, assignedTeam: teamId, assignedMembers: memberIds }
        : task
    ));
  };

  const handleTeamUpdate = (updatedTeam: Team) => {
    setTeams(prev => prev.map(team => 
      team.id === updatedTeam.id ? updatedTeam : team
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} onLogout={onLogout} />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={onLogout} />
      
      <main className="p-6">
        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedule">Scheduling Board</TabsTrigger>
            <TabsTrigger value="requests">Pending Requests</TabsTrigger>
            <TabsTrigger value="teams">Team Management</TabsTrigger>
          </TabsList>
          
          <TabsContent value="schedule" className="space-y-6">
            <SchedulingBoard
              tasks={tasks}
              teams={teams}
              onTaskUpdate={handleTaskUpdate}
              onTaskAssign={handleTaskAssign}
              isEditable={true}
            />
          </TabsContent>
          
          <TabsContent value="requests" className="space-y-6">
            <PendingRequests
              tasks={tasks}
              onTaskUpdate={handleTaskUpdate}
              onTaskAssign={handleTaskAssign}
              teams={teams}
            />
          </TabsContent>
          
          <TabsContent value="teams" className="space-y-6">
            <TeamManagement
              teams={teams}
              onTeamUpdate={handleTeamUpdate}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}