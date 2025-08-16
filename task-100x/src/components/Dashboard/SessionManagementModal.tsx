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
}

const SessionManagementModal = ({
  isOpen,
  onClose,
  cohortId,
  onSessionCreated,
  totalWeeks,
}: SessionManagementModalProps) => {
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [sessionWeekNumber, setSessionWeekNumber] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const { toast } = useToast();

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
      fetchSessions(); // Refresh the list of sessions
      onClose();
      setSessionTitle('');
      setSessionDescription('');
      setSessionWeekNumber(1);
      setEditingSession(null);
    } catch (error) {
      console.error('Failed to save session:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${editingSession ? 'update' : 'submit'} session details. Please try again.`, 
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    if (!cohortId) return;
    setLoading(true);
    try {
      const fetchedSessions = await instructor.getSessions(cohortId);
      setSessions(fetchedSessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch sessions. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && cohortId) {
      fetchSessions();
    }
  }, [isOpen, cohortId]);

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    setSessionTitle(session.title);
    setSessionDescription(session.description);
    setSessionWeekNumber(session.weekNumber);
  };

  const handleDelete = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this session?')) {
      return;
    }
    setLoading(true);
    try {
      await instructor.deleteSession(sessionId);
      toast({
        title: 'Success',
        description: 'Session deleted successfully.',
      });
      fetchSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete session. Please try again.',
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
              setEditingSession(null);
              setSessionTitle('');
              setSessionDescription('');
              setSessionWeekNumber(1);
            }}>
              Cancel Edit
            </Button>
          )}

          <h3 className="text-lg font-semibold mt-6">Existing Sessions</h3>
          {loading && sessions.length === 0 ? (
            <p>Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p>No sessions created yet for this cohort.</p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {sessions?.map((session) => (
                <div key={session.id} className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{session.title} (Week {session.weekNumber})</p>
                    <p className="text-sm text-gray-500">{session.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(session)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(session.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionManagementModal;