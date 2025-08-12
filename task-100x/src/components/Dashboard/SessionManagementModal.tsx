import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { instructor } from '@/lib/api';

interface SessionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  cohortId: string | null;
}

const SessionManagementModal = ({
  isOpen,
  onClose,
  cohortId,
}: SessionManagementModalProps) => {
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [loading, setLoading] = useState(false);
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

    if (!sessionTitle.trim() || !sessionDescription.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Session title and description are required.',
      });
      return;
    }

    setLoading(true);
    try {
      await instructor.createSession(cohortId, { title: sessionTitle, description: sessionDescription });
      toast({
        title: 'Success',
        description: 'Session details submitted and notification process initiated.',
      });
      onClose();
      setSessionTitle('');
      setSessionDescription('');
    } catch (error) {
      console.error('Failed to create session:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit session details. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Session Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
        </div>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Session Details'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default SessionManagementModal;