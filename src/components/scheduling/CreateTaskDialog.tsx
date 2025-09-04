import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Task, TaskType, TaskStatus, DemoMode } from '../../types/Task';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: string;
  initialTime: string;
  onTaskCreate: (task: Task) => void;
}

export function CreateTaskDialog({ 
  open, 
  onOpenChange, 
  initialDate, 
  initialTime, 
  onTaskCreate 
}: CreateTaskDialogProps) {
  const [formData, setFormData] = useState({
    type: TaskType.DEMO,
    title: '',
    clientName: '',
    clientMobile: '',
    clientEmail: '',
    demoMode: DemoMode.ONSITE,
    salesRep: '',
    recipes: '',
    remarks: '',
    duration: 2
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newTask: Task = {
      id: `task-${Date.now()}`,
      type: formData.type,
      title: formData.title,
      clientName: formData.clientName || undefined,
      clientMobile: formData.clientMobile || undefined,
      clientEmail: formData.clientEmail || undefined,
      demoMode: formData.demoMode,
      scheduledDate: initialDate,
      scheduledTime: initialTime,
      duration: formData.duration,
      salesRep: formData.salesRep || undefined,
      recipes: formData.recipes ? formData.recipes.split(',').map(r => r.trim()) : undefined,
      remarks: formData.remarks || undefined,
      status: TaskStatus.PLANNED,
      createdBy: 'current-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onTaskCreate(newTask);
    
    // Reset form
    setFormData({
      type: TaskType.DEMO,
      title: '',
      clientName: '',
      clientMobile: '',
      clientEmail: '',
      demoMode: DemoMode.ONSITE,
      salesRep: '',
      recipes: '',
      remarks: '',
      duration: 2
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a new task by filling out the form below. Please provide all necessary details for proper scheduling and execution.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Task Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as TaskType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TaskType.DEMO}>Demo</SelectItem>
                  <SelectItem value={TaskType.DEPLOYMENT}>Deployment</SelectItem>
                  <SelectItem value={TaskType.RECIPE_DEVELOPMENT}>Recipe Development</SelectItem>
                  <SelectItem value={TaskType.VIDEOSHOOT}>Videoshoot</SelectItem>
                  <SelectItem value={TaskType.EVENT}>Event</SelectItem>
                  <SelectItem value={TaskType.DEVICE_TESTING}>Device Testing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (hours)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="8"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Demo for Restaurant ABC"
              required
            />
          </div>

          {[TaskType.DEMO, TaskType.DEPLOYMENT].includes(formData.type) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  placeholder="Client/Company name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientMobile">Client Mobile</Label>
                  <Input
                    id="clientMobile"
                    value={formData.clientMobile}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientMobile: e.target.value }))}
                    placeholder="+91 98765 43210"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Client Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                    placeholder="client@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="demoMode">Demo Mode</Label>
                  <Select value={formData.demoMode} onValueChange={(value) => setFormData(prev => ({ ...prev, demoMode: value as DemoMode }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DemoMode.ONSITE}>Onsite</SelectItem>
                      <SelectItem value={DemoMode.VIRTUAL}>Virtual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="salesRep">Sales Representative</Label>
                  <Input
                    id="salesRep"
                    value={formData.salesRep}
                    onChange={(e) => setFormData(prev => ({ ...prev, salesRep: e.target.value }))}
                    placeholder="Sales rep name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipes">Recipes (comma-separated)</Label>
                <Input
                  id="recipes"
                  value={formData.recipes}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipes: e.target.value }))}
                  placeholder="Butter Chicken, Biryani, Naan"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks/Notes</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              placeholder="Additional notes or requirements"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}