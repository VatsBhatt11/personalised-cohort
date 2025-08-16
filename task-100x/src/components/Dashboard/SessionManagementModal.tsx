import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { instructor } from '@/lib/api';

interface Session {
  id: string;
  title: string;
  description: string;
  weekNumber: number;
  cohortId: string;
}

interface SessionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  cohortId: string;
  onSessionCreated: () => void;
  totalWeeks: number;
  editingSession: Session | null;
}

const SessionManagementModal = ({
  isOpen,
  onClose,
  cohortId,
  onSessionCreated,
  totalWeeks,
  editingSession,
}: SessionManagementModalProps) => {
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [sessionWeekNumber, setSessionWeekNumber] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (editingSession) {
      setSessionTitle(editingSession.title);
      setSessionDescription(editingSession.description);
      setSessionWeekNumber(editingSession.weekNumber);
    } else {
      setSessionTitle('');
      setSessionDescription('');
      setSessionWeekNumber(1);
    }
  }, [editingSession]);

  const handleSubmit = async () => {
    if (!cohortId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cohort not selected.',
      });
      return;
    }

    if (!sessionTitle.trim() || !sessionDescription.trim() || !sessionWeekNumber) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Session title, description, and week number are required.',
      });
      return;
    }

    setLoading(true);
    try {
      if (editingSession) {
        // Update existing session
        await instructor.updateSession(editingSession.id, { title: sessionTitle, description: sessionDescription, weekNumber: sessionWeekNumber });
        toast({
          title: 'Success',
          description: 'Session updated successfully.',
        });
      } else {
        // Create new session
        await instructor.createSession(cohortId, { title: sessionTitle, description: sessionDescription, weekNumber: sessionWeekNumber });
        toast({
          title: 'Success',
          description: 'Session details submitted and notification process initiated.',
        });
      }
      onClose();
      // The useEffect hook will handle resetting the form when editingSession becomes null
    } catch (error) {
      console.error('Failed to save session:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${editingSession ? 'update' : 'submit'} session details. Please try again.` 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Sessions</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <h3 className="text-lg font-semibold">{editingSession ? 'Edit Session' : 'Create New Session'}</h3>
          <div className="space-y-2">
            <Label htmlFor="sessionTitle">Session Title</Label>
            <Input
              id="sessionTitle"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="e.g., Introduction to React"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionDescription">Session Description</Label>
            <Input
              id="sessionDescription"
              value={sessionDescription}
              onChange={(e) => setSessionDescription(e.target.value)}
              placeholder="e.g., A deep dive into React hooks"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionWeekNumber">Week Number</Label>
            <Select
              value={String(sessionWeekNumber)}
              onValueChange={(value) => setSessionWeekNumber(parseInt(value))}
            >
              <SelectTrigger id="sessionWeekNumber" className="w-full p-3 border border-orange-500/30 rounded-xl bg-gray-900 text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 ease-in-out shadow-lg hover:border-400">
                <SelectValue placeholder="Select a week" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 text-white border border-orange-500/30 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
                  <SelectItem key={week} value={String(week)} className="hover:bg-orange-500/20 focus:bg-orange-500/20 cursor-pointer py-2 px-4 transition-colors duration-200 ease-in-out">
                    Week {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (editingSession ? 'Updating...' : 'Submitting...') : (editingSession ? 'Update Session' : 'Create Session')}
          </Button>
          {editingSession && (
            <Button variant="outline" onClick={() => {
              onClose(); // This will trigger the useEffect to reset the form
            }}>
              Cancel Edit
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionManagementModal;