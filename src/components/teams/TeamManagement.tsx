import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Edit, 
  Plus, 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  UserCheck, 
  Save, 
  X 
} from 'lucide-react';
import { TEAM_GROUPS, KITCHEN_TEAM_MEMBERS } from '../../utils/constants';

interface TeamManagementProps {
  onClose: () => void;
}

interface TeamMember {
  id: string;
  name: string;
  isActive: boolean;
}

interface Team {
  id: number;
  name: string;
  members: string[];
}

export function TeamManagement({ onClose }: TeamManagementProps) {
  const [teams, setTeams] = useState<Team[]>(TEAM_GROUPS);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');

  // Get all assigned members across all teams
  const getAssignedMembers = () => {
    return new Set(teams.flatMap(team => team.members));
  };

  // Get available kitchen team members not assigned to any team
  const getAvailableMembers = () => {
    const assignedMembers = getAssignedMembers();
    return KITCHEN_TEAM_MEMBERS.filter(member => !assignedMembers.has(member));
  };

  const availableMembers = getAvailableMembers();

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
  };

  const handleSaveTeam = () => {
    if (editingTeam && teamName.trim()) {
      const updatedTeams = teams.map(team => 
        team.id === editingTeam.id 
          ? { ...team, name: teamName.trim() }
          : team
      );
      setTeams(updatedTeams);
      
      // Update the global TEAM_GROUPS constant (this will persist until page refresh)
      const teamIndex = TEAM_GROUPS.findIndex(t => t.id === editingTeam.id);
      if (teamIndex !== -1) {
        TEAM_GROUPS[teamIndex] = { ...TEAM_GROUPS[teamIndex], name: teamName.trim() };
      }
      
      setEditingTeam(null);
      setTeamName('');
    }
  };

  const handleAddMemberToTeam = () => {
    if (selectedMember && selectedTeamId) {
      const updatedTeams = teams.map(team => 
        team.id === selectedTeamId 
          ? { ...team, members: [...team.members, selectedMember] }
          : team
      );
      setTeams(updatedTeams);
      
      // Update the global TEAM_GROUPS constant
      const teamIndex = TEAM_GROUPS.findIndex(t => t.id === selectedTeamId);
      if (teamIndex !== -1) {
        TEAM_GROUPS[teamIndex] = { ...TEAM_GROUPS[teamIndex], members: [...TEAM_GROUPS[teamIndex].members, selectedMember] };
      }
      
      setSelectedMember('');
      setSelectedTeamId(null);
      setShowAddMember(false);
    }
  };

  const handleRemoveMember = (teamId: number, memberName: string) => {
    const updatedTeams = teams.map(team => 
      team.id === teamId 
        ? { ...team, members: team.members.filter(m => m !== memberName) }
        : team
    );
    setTeams(updatedTeams);
    
    // Update the global TEAM_GROUPS constant
    const teamIndex = TEAM_GROUPS.findIndex(t => t.id === teamId);
    if (teamIndex !== -1) {
      TEAM_GROUPS[teamIndex] = { ...TEAM_GROUPS[teamIndex], members: TEAM_GROUPS[teamIndex].members.filter(m => m !== memberName) };
    }
  };

  const handleCreateNewMember = () => {
    if (newMemberName.trim()) {
      // Add to kitchen team members list
      KITCHEN_TEAM_MEMBERS.push(newMemberName.trim());
      
      // If a team is selected, add to that team
      if (selectedTeamId) {
        const updatedTeams = teams.map(team => 
          team.id === selectedTeamId 
            ? { ...team, members: [...team.members, newMemberName.trim()] }
            : team
        );
        setTeams(updatedTeams);
        
        // Update the global TEAM_GROUPS constant
        const teamIndex = TEAM_GROUPS.findIndex(t => t.id === selectedTeamId);
        if (teamIndex !== -1) {
          TEAM_GROUPS[teamIndex] = { ...TEAM_GROUPS[teamIndex], members: [...TEAM_GROUPS[teamIndex].members, newMemberName.trim()] };
        }
      }

      // Reset form
      setNewMemberName('');
      setSelectedTeamId(null);
      setShowCreateMember(false);
    }
  };

  const getTotalMembers = () => teams.reduce((total, team) => total + team.members.length, 0);

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Kitchen Team Management
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Head Chef Controls
              </Badge>
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Manage culinary team members across all kitchen teams. {getTotalMembers()} total members, {availableMembers.length} unassigned.
            </p>
          </DialogHeader>

          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowAddMember(true)}
                disabled={availableMembers.length === 0}
                className="gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Assign Members ({availableMembers.length} available)
              </Button>
              <Button 
                onClick={() => setShowCreateMember(true)}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add New Member
              </Button>
            </div>

            {/* Teams Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <Card key={team.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-base">{team.name}</span>
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTeam(team)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-2">
                    {team.members.length > 0 ? (
                      team.members.map((memberName, index) => (
                        <div
                          key={`${team.id}-${memberName}-${index}`}
                          className="flex items-center justify-between p-2 rounded-lg border bg-green-50 border-green-200"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {memberName}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(team.id, memberName)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            title="Remove from team"
                          >
                            <UserMinus className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <Users className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No members assigned</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Available Members */}
            {availableMembers.length > 0 && (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-orange-500" />
                    Unassigned Members ({availableMembers.length})
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Kitchen team members not currently assigned to any team
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {availableMembers.map((member) => (
                      <Badge
                        key={member}
                        variant="outline"
                        className="p-2 text-sm cursor-pointer hover:bg-primary/10 border-orange-300 text-orange-700"
                        onClick={() => {
                          setSelectedMember(member);
                          setShowAddMember(true);
                        }}
                      >
                        <div className="w-2 h-2 rounded-full mr-2 bg-orange-500" />
                        {member}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={onClose}>
                <Save className="w-4 h-4 mr-2" />
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      {editingTeam && (
        <Dialog open={!!editingTeam} onOpenChange={() => setEditingTeam(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingTeam(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTeam} disabled={!teamName.trim()}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Member to Team Dialog */}
      {showAddMember && (
        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Member to Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="member">Select Member</Label>
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => (
                      <SelectItem key={member} value={member}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          {member}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="team">Select Team</Label>
                <Select 
                  value={selectedTeamId?.toString() || ''} 
                  onValueChange={(value) => setSelectedTeamId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name} ({team.members.length} members)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddMember(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddMemberToTeam}
                  disabled={!selectedMember || !selectedTeamId}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create New Member Dialog */}
      {showCreateMember && (
        <Dialog open={showCreateMember} onOpenChange={setShowCreateMember}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Kitchen Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newMemberName">Member Name</Label>
                <Input
                  id="newMemberName"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Enter new team member name"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="assignTeam">Assign to Team (Optional)</Label>
                <Select 
                  value={selectedTeamId?.toString() || ''} 
                  onValueChange={(value) => setSelectedTeamId(value ? parseInt(value) : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Leave unassigned or choose a team..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Leave Unassigned</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name} ({team.members.length} members)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateMember(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateNewMember}
                  disabled={!newMemberName.trim()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}