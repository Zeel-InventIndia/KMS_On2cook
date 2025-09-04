import { useState } from 'react';
import { Team, TeamMember } from '../types/Task';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { 
  Users, UserPlus, UserMinus, Plus, CheckCircle, AlertCircle, Save, X 
} from 'lucide-react';
import { mockTeamMembers } from '../data/mockData';

interface TeamMembersModalProps {
  team: Team | null;
  allTeams: Team[];
  onClose: () => void;
  onTeamUpdate: (team: Team) => void;
  onTeamMemberCreate?: (member: TeamMember) => void;
}

export function TeamMembersModal({ 
  team, 
  allTeams, 
  onClose, 
  onTeamUpdate, 
  onTeamMemberCreate 
}: TeamMembersModalProps) {
  const [showCreateMember, setShowCreateMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberActive, setNewMemberActive] = useState(true);

  if (!team) return null;

  // Get all assigned member IDs across all teams
  const assignedMemberIds = new Set(
    allTeams.flatMap(t => t.members.map(member => member.id))
  );

  // Get available members (not assigned to any team)
  const availableMembers = mockTeamMembers.filter(member => 
    !assignedMemberIds.has(member.id)
  );

  const handleAddMemberToTeam = () => {
    if (selectedMember) {
      const member = mockTeamMembers.find(m => m.id === selectedMember);
      
      if (member) {
        const updatedTeam = {
          ...team,
          members: [...team.members, member]
        };
        onTeamUpdate(updatedTeam);
        setSelectedMember('');
      }
    }
  };

  const handleRemoveMember = (memberId: string) => {
    const updatedTeam = {
      ...team,
      members: team.members.filter(m => m.id !== memberId)
    };
    onTeamUpdate(updatedTeam);
  };

  const handleToggleMemberStatus = (memberId: string) => {
    const updatedTeam = {
      ...team,
      members: team.members.map(member => 
        member.id === memberId 
          ? { ...member, isActive: !member.isActive }
          : member
      )
    };
    onTeamUpdate(updatedTeam);
  };

  const handleCreateNewMember = () => {
    if (newMemberName.trim()) {
      const newMember: TeamMember = {
        id: `member_${Date.now()}`,
        name: newMemberName.trim(),
        isActive: newMemberActive
      };

      // Add to mockTeamMembers for future use
      mockTeamMembers.push(newMember);

      // Add to current team
      const updatedTeam = {
        ...team,
        members: [...team.members, newMember]
      };
      onTeamUpdate(updatedTeam);

      // Call the optional callback for external handling
      if (onTeamMemberCreate) {
        onTeamMemberCreate(newMember);
      }

      // Reset form
      setNewMemberName('');
      setNewMemberActive(true);
      setShowCreateMember(false);
    }
  };

  return (
    <Dialog open={!!team} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            {team.name} - Team Members
          </DialogTitle>
          <DialogDescription>
            Manage team members and their status. Add, remove, or modify member assignments for this team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Team Summary */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {team.members.length} member{team.members.length !== 1 ? 's' : ''}
              </Badge>
              <Badge variant="outline">
                {team.members.filter(m => m.isActive).length} active
              </Badge>
            </div>
          </div>

          {/* Current Team Members */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Current Members</Label>
              <Button 
                size="sm"
                onClick={() => setShowCreateMember(true)}
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add New Member
              </Button>
            </div>
            
            {team.members.length > 0 ? (
              <div className="space-y-2">
                {team.members.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      member.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        member.isActive ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <span className={`font-medium ${
                        member.isActive ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {member.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleMemberStatus(member.id)}
                        className="h-8 w-8 p-0"
                        title={member.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {member.isActive ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        title="Remove from team"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No members assigned</p>
                <p className="text-sm text-gray-400">Add members to this team to get started</p>
              </div>
            )}
          </div>

          {/* Add Existing Members */}
          {availableMembers.length > 0 && (
            <div className="space-y-3">
              <Separator />
              <Label className="text-base font-medium">Add Existing Members</Label>
              
              <div className="flex gap-2">
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            member.isActive ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          {member.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleAddMemberToTeam}
                  disabled={!selectedMember}
                  className="gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {availableMembers.map((member) => (
                  <Badge
                    key={member.id}
                    variant={member.isActive ? "default" : "secondary"}
                    className="p-2 text-sm cursor-pointer hover:bg-primary/10"
                    onClick={() => setSelectedMember(member.id)}
                  >
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      member.isActive ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    {member.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Create New Member Section */}
          {showCreateMember && (
            <div className="space-y-3">
              <Separator />
              <Label className="text-base font-medium">Create New Member</Label>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="newMemberName">Member Name</Label>
                  <Input
                    id="newMemberName"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Enter member name"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="newMemberActive"
                    checked={newMemberActive}
                    onCheckedChange={setNewMemberActive}
                  />
                  <Label htmlFor="newMemberActive">Active Member</Label>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateMember(false);
                      setNewMemberName('');
                      setNewMemberActive(true);
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateNewMember}
                    disabled={!newMemberName.trim()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create & Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>
              <Save className="w-4 h-4 mr-2" />
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}