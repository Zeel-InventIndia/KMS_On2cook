import { User, UserRole } from '../types/User';
import { HeadChefDashboard } from './dashboards/HeadChefDashboard';
import { PresalesDashboard } from './dashboards/PresalesDashboard';
import { SalesDashboard } from './dashboards/SalesDashboard';
import { CEODashboard } from './dashboards/CEODashboard';
import { CulinaryTeamDashboard } from './dashboards/CulinaryTeamDashboard';
import { ContentManagerDashboard } from './dashboards/ContentManagerDashboard';

interface DashboardRouterProps {
  user: User;
  onLogout: () => void;
}

export function DashboardRouter({ user, onLogout }: DashboardRouterProps) {
  const getDashboard = () => {
    switch (user.role) {
      case UserRole.HEAD_CHEF:
        return <HeadChefDashboard user={user} onLogout={onLogout} />;
      case UserRole.PRESALES:
        return <PresalesDashboard user={user} onLogout={onLogout} />;
      case UserRole.SALES:
        return <SalesDashboard user={user} onLogout={onLogout} />;
      case UserRole.CEO:
        return <CEODashboard user={user} onLogout={onLogout} />;
      case UserRole.CULINARY_TEAM:
        return <CulinaryTeamDashboard user={user} onLogout={onLogout} />;
      case UserRole.CONTENT_MANAGER:
        return <ContentManagerDashboard user={user} onLogout={onLogout} />;
      default:
        return <div>Dashboard not found</div>;
    }
  };

  return getDashboard();
}