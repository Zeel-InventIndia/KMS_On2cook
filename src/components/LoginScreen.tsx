import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { User, USERS } from '../types/User';
import { ChefHat } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const handleLogin = () => {
    if (selectedUserId) {
      onLogin(USERS[selectedUserId as keyof typeof USERS]);
    }
  };

  const usersByRole = Object.entries(USERS).reduce((acc, [key, user]) => {
    if (!acc[user.role]) {
      acc[user.role] = [];
    }
    acc[user.role].push({ key, user });
    return acc;
  }, {} as Record<string, Array<{ key: string; user: User }>>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">On2Cook Kitchen Management</CardTitle>
          <p className="text-gray-600">Select your profile to continue</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose your profile" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(usersByRole).map(([role, users]) => (
                <div key={role}>
                  <div className="px-2 py-1.5 text-sm font-medium text-gray-500 capitalize">
                    {role.replace('_', ' ')}
                  </div>
                  {users.map(({ key, user }) => (
                    <SelectItem key={key} value={key}>
                      {user.name}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleLogin} 
            disabled={!selectedUserId}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}