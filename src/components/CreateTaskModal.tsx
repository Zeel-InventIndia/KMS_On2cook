import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Task } from '../App';

interface CreateTaskModalProps {
  onClose: () => void;
  onSave: (task: Task) => void;
  createdBy: string;
  preselectedTeam?: number | null;
  preselectedSlot?: string | null;
}

export function CreateTaskModal({ 
  onClose, 
  onSave, 
  createdBy, 
  preselectedTeam,
  preselectedSlot 
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Task['type']>('demo');
  const [date, setDate] = useState(preselectedSlot?.split('-').slice(0, 3).join('-') || '');
  const [time, setTime] = useState(preselectedSlot?.split('-').slice(3).join('-') || '');
  const [notes, setNotes] = useState('');
  const [clientName, setClientName] = useState('');

  const taskTypes: { value: Task['type']; label: string }[] = [
    { value: 'demo', label: 'Demo (Onsite/Virtual)' },
    { value: 'deployment', label: 'Deployment' },
    { value: 'recipe_development', label: 'Recipe Development' },
    { value: 'videoshoot', label: 'Video Shoot' },
    { value: 'event', label: 'Event' },
    { value: 'device_testing', label: 'Device Testing' }
  ];

  const handleSave = () => {
    if (!title || !date || !time) return;

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      type,
      date,
      time,
      status: preselectedTeam ? 'assigned' : 'pending',
      createdBy,
      notes: notes || undefined,
      clientName: clientName || undefined,
      assignedTeam: preselectedTeam || undefined,
      assignedSlot: preselectedTeam ? `${date}-${time}` : undefined
    };

    onSave(newTask);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {preselectedTeam ? `Create Task for Team ${preselectedTeam}` : 'Create New Task'}
          </DialogTitle>
          <DialogDescription>
            Fill out the form below to create a new task for the kitchen team. All required fields must be completed.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Task Type</Label>
            <Select value={type} onValueChange={(value: Task['type']) => setType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {taskTypes.map(taskType => (
                  <SelectItem key={taskType.value} value={taskType.value}>
                    {taskType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="09:00">09:00 AM</SelectItem>
                  <SelectItem value="11:00">11:00 AM</SelectItem>
                  <SelectItem value="13:00">01:00 PM</SelectItem>
                  <SelectItem value="15:00">03:00 PM</SelectItem>
                  <SelectItem value="17:00">05:00 PM</SelectItem>
                  <SelectItem value="19:00">07:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(type === 'demo' || type === 'deployment') && (
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name (Optional)</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes"
              rows={3}
            />
          </div>

          {preselectedTeam && (
            <div className="p-3 bg-blue-50 rounded text-sm">
              <strong>Note:</strong> This task will be assigned to Team {preselectedTeam} 
              {preselectedSlot && ` at the selected time slot`}.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!title || !date || !time}
            >
              Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}