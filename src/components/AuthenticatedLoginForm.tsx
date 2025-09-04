import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { User, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { User as UserType } from '../App';

interface AuthenticatedLoginFormProps {
  onLogin: (user: UserType) => void;
  onDemoLogin?: (role: UserType['role'], team?: number) => void;
  fallbackUsers?: UserType[];
}

export function AuthenticatedLoginForm({ onLogin, onDemoLogin, fallbackUsers = [] }: AuthenticatedLoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('signin');
  
  // Sign in form state
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  // Sign up form state
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    name: '',
    role: '' as UserType['role'] | '',
    team: ''
  });

  // Mock user selection
  const [selectedMockUser, setSelectedMockUser] = useState<string>('');

  // Check for existing session on load
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchUserProfile(session.access_token);
      }
    } catch (error) {
      console.error('Session check error:', error);
    }
  };

  const fetchUserProfile = async (accessToken: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        onLogin(data.profile);
      } else {
        setError('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      setError('Failed to fetch user profile');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) {
        setError(error.message);
      } else if (data.session) {
        await fetchUserProfile(data.session.access_token);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError('An unexpected error occurred during sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3005c377/auth/signup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: signUpData.email,
          password: signUpData.password,
          name: signUpData.name,
          role: signUpData.role,
          team: signUpData.team ? parseInt(signUpData.team) : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        // After successful signup, sign in the user
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: signUpData.email,
          password: signUpData.password,
        });

        if (signInError) {
          setError(signInError.message);
        } else if (signInData.session) {
          await fetchUserProfile(signInData.session.access_token);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setError('An unexpected error occurred during sign up');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMockLogin = () => {
    const mockUser = fallbackUsers.find(u => u.id === selectedMockUser);
    if (mockUser) {
      onLogin(mockUser);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">On2Cook Kitchen Management</CardTitle>
          <p className="text-gray-600 mt-2">Sign in to access your dashboard</p>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="demo">Demo</TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={signInData.email}
                    onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={signInData.password}
                    onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    'Signing in...'
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    value={signUpData.name}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Create a password"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="signup-role">Role</Label>
                  <Select value={signUpData.role} onValueChange={(value) => setSignUpData(prev => ({ ...prev, role: value as UserType['role'] }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="head_chef">Head Chef</SelectItem>
                      <SelectItem value="presales">Presales</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="ceo">CEO</SelectItem>
                      <SelectItem value="culinary_team">Culinary Team</SelectItem>
                      <SelectItem value="vijay">Media Manager (Vijay)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {signUpData.role === 'culinary_team' && (
                  <div>
                    <Label htmlFor="signup-team">Team Number</Label>
                    <Select value={signUpData.team} onValueChange={(value) => setSignUpData(prev => ({ ...prev, team: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team number" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Team 1</SelectItem>
                        <SelectItem value="2">Team 2</SelectItem>
                        <SelectItem value="3">Team 3</SelectItem>
                        <SelectItem value="4">Team 4</SelectItem>
                        <SelectItem value="5">Team 5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading || !signUpData.role}>
                  {isLoading ? (
                    'Creating account...'
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Demo Tab */}
            <TabsContent value="demo">
              <div className="space-y-4">
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
                  <strong>Quick Demo Access</strong><br />
                  Try the app instantly with predefined demo users. No registration required!
                </div>
                
                {/* Quick Demo Buttons */}
                <div className="space-y-2">
                  <Button 
                    onClick={() => onDemoLogin?.('head_chef')} 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Demo Head Chef (Full Access)
                  </Button>
                  
                  <Button 
                    onClick={() => onDemoLogin?.('presales')} 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Demo Presales (Recipe Management)
                  </Button>
                  
                  <Button 
                    onClick={() => onDemoLogin?.('sales')} 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Demo Sales (View Only Access)
                  </Button>
                  
                  <Button 
                    onClick={() => onDemoLogin?.('culinary_team', 1)} 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Demo Team Member (Team 1)
                  </Button>
                  
                  <Button 
                    onClick={() => onDemoLogin?.('vijay')} 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Demo Vijay (Media Manager)
                  </Button>

                  <Button 
                    onClick={() => onDemoLogin?.('ceo')} 
                    className="w-full justify-start" 
                    variant="outline"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Demo CEO (Full Overview)
                  </Button>
                </div>

                {/* Fallback user selection if provided */}
                {fallbackUsers.length > 0 && (
                  <>
                    <div className="text-center text-sm text-gray-500 my-3">
                      <span>Or select from existing users</span>
                    </div>
                    <div>
                      <Label htmlFor="demo-user">Select Demo User</Label>
                      <Select value={selectedMockUser} onValueChange={setSelectedMockUser}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a demo user" />
                        </SelectTrigger>
                        <SelectContent>
                          {fallbackUsers.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.role.replace('_', ' ')}
                              {user.team && ` - Team ${user.team}`})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleMockLogin} className="w-full" disabled={!selectedMockUser}>
                      <LogIn className="w-4 h-4 mr-2" />
                      Login as Selected User
                    </Button>
                  </>
                )}
                
                <div className="text-xs text-gray-500 text-center space-y-1">
                  <div>Demo users use mock data and full functionality</div>
                  <div className="space-y-1">
                    <div><strong>Presales:</strong> Can add/manage recipes for assigned demos</div>
                    <div><strong>Sales:</strong> View-only access to demos with their name as sales rep</div>
                    <div><strong>Head Chef:</strong> Assign demos to culinary teams</div>
                    <div><strong>CEO:</strong> Overview of all demo activities</div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Make supabase available globally for the recipe component */}
      <script
        dangerouslySetInnerHTML={{
          __html: `window.supabase = ${JSON.stringify({ auth: { getSession: () => ({ data: { session: null } }) } })};`
        }}
      />
    </div>
  );
}