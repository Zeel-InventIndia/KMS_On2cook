import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { User } from '../App';

interface LoginFormProps {
  onLogin: (user: User) => void;
  users: User[];
}

export function LoginForm({ onLogin, users }: LoginFormProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const handleLogin = () => {
    const user = users.find(u => u.id === selectedUserId);
    if (user) {
      onLogin(user);
    }
  };

  const groupedUsers = users.reduce((acc, user) => {
    if (!acc[user.role]) {
      acc[user.role] = [];
    }
    acc[user.role].push(user);
    return acc;
  }, {} as Record<string, User[]>);

  const roleLabels = {
    head_chef: 'Head Chefs',
    presales: 'Presales Team',
    sales: 'Sales Team',
    ceo: 'CEO',
    culinary_team: 'Culinary Team',
    vijay: 'Media Manager'
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">On2Cook Kitchen Management</CardTitle>
          <p className="text-gray-600">Select your profile to continue</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="user-select" className="block font-medium">
              Select User
            </label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your profile" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedUsers).map(([role, roleUsers]) => (
                  <div key={role}>
                    <div className="px-2 py-1 font-semibold text-sm text-gray-700 bg-gray-100">
                      {roleLabels[role as keyof typeof roleLabels]}
                    </div>
                    {roleUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} {user.team && `(Team ${user.team})`}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleLogin} 
            disabled={!selectedUserId}
            className="w-full"
          >
            Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}