import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Calendar } from "./ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { User } from "../types/User";
import { DemoRequest } from "../types/DemoRequest";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface CreateKitchenRequestModalProps {
  open: boolean;
  onClose: () => void;
  onCreateRequest: (request: DemoRequest) => void;
  user: User;
}

export function CreateKitchenRequestModal({
  open,
  onClose,
  onCreateRequest,
  user,
}: CreateKitchenRequestModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientMobile, setClientMobile] = useState("");
  const [demoDate, setDemoDate] = useState<Date | undefined>(
    undefined,
  );
  const [demoMode, setDemoMode] = useState<"onsite" | "online">(
    "onsite",
  );
  const [showCalendar, setShowCalendar] = useState(false);

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!clientName.trim()) {
      setError("Client name is required");
      return;
    }
    if (!clientEmail.trim()) {
      setError("Client email is required");
      return;
    }
    if (!demoDate) {
      setError("Demo date is required");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setIsCreating(true);

    try {
      // Prepare request data
      const requestData = {
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientMobile: clientMobile.trim(),
        demoDate: formatDateForInput(demoDate),
        demoMode,
        createdBy: user.name,
        createdAt: new Date().toISOString(),
      };

      console.log("🍳 Creating kitchen request:", requestData);

      // Create kitchen request via server endpoint (handles both KV store and Google Sheets)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3005c377/kitchen-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(requestData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to create kitchen request: ${response.status}`,
        );
      }

      const result = await response.json();
      console.log("✅ Kitchen request created successfully:", result);

      // Create the demo request object for the frontend
      const newDemoRequest: DemoRequest = {
        id: result.data.id,
        clientName: requestData.clientName,
        clientEmail: requestData.clientEmail,
        clientMobile: requestData.clientMobile,
        demoDate: requestData.demoDate,
        demoTime: "10:00 AM",
        demoMode: requestData.demoMode,
        leadStatus: "demo_planned",
        salesRep: "",
        assignee: "",
        recipes: [],
        type: "demo",
        status: "pending",
        statusChangedAt: new Date().toISOString(),
        assignedMembers: [],
        source: "kitchen_request",
        createdBy: user.name,
        createdAt: new Date().toISOString(),
      };

      // Call the parent handler to add the request to the frontend
      onCreateRequest(newDemoRequest);

      // Close modal and reset form
      onClose();
      resetForm();
    } catch (error) {
      console.error(
        "❌ Error creating kitchen request:",
        error,
      );
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create kitchen request",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setClientName("");
    setClientEmail("");
    setClientMobile("");
    setDemoDate(undefined);
    setDemoMode("onsite");
    setError(null);
  };

  const handleClose = () => {
    if (!isCreating) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-[500px]"
        aria-describedby="kitchen-request-description"
      >
        <DialogHeader>
          <DialogTitle>Create New Task Request</DialogTitle>
          <p
            id="kitchen-request-description"
            className="text-sm text-muted-foreground"
          >
            Create a new task request that will be saved to
            Google Sheets and appear in the unassigned
            requests list for team assignment.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name *</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client full name"
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientEmail">Client Email *</Label>
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="Enter client email address"
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientMobile">Client Mobile</Label>
            <Input
              id="clientMobile"
              value={clientMobile}
              onChange={(e) => setClientMobile(e.target.value)}
              placeholder="Enter client mobile number"
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label>Demo Date *</Label>
            <Popover
              open={showCalendar}
              onOpenChange={setShowCalendar}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left"
                  disabled={isCreating}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {demoDate
                    ? formatDateForInput(demoDate)
                    : "Select demo date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={demoDate}
                  onSelect={(date) => {
                    setDemoDate(date);
                    setShowCalendar(false);
                  }}
                  disabled={(date) =>
                    date <
                    new Date(new Date().setHours(0, 0, 0, 0))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="demoMode">Demo Mode</Label>
            <Select
              value={demoMode}
              onValueChange={(value: "onsite" | "online") =>
                setDemoMode(value)
              }
              disabled={isCreating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="onsite">
                  Onsite Demo
                </SelectItem>
                <SelectItem value="online">
                  Online Demo
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">
            <p>
              <strong>Note:</strong> This request will be saved
              to Google Sheets (gid=731376890) and appear in the
              unassigned requests list for team assignment.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Task...
                </>
              ) : (
                "Create Task"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}