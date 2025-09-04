import { Button } from '../ui/button';
import { User } from '../../types/User';
import { ChefHat, LogOut, User as UserIcon, ExternalLink, CheckCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { ON2COOK_SPREADSHEET_URL } from '../../utils/constants';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  title?: string;
  showSheetsStatus?: boolean;
}

export function Header({ user, onLogout, title = 'On2Cook Kitchen Management', showSheetsStatus = true }: HeaderProps) {
  
  const openSpreadsheet = () => {
    window.open(ON2COOK_SPREADSHEET_URL, '_blank');
  };
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500 capitalize">
                {user.role.replace('_', ' ')} Dashboard
              </p>
              {showSheetsStatus && (
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  <CheckCircle className="w-3 h-3" />
                  <span>Google Sheets Connected</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <UserIcon className="w-4 h-4" />
              <span>{user.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {showSheetsStatus && (
              <DropdownMenuItem onClick={openSpreadsheet}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Spreadsheet
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}