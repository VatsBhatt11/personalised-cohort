import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { instructor } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { isAxiosError } from 'axios';

interface Notification {
  id: string;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface NotificationModalProps {
  sessionId: string;
  sessionTitle: string;
  weekNumber: number;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ sessionId, sessionTitle, weekNumber, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [editingNotificationId, setEditingNotificationId] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, [sessionId]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await instructor.getSessionNotifications(sessionId);
      setNotifications(response);
    } catch (error) {
      if (isAxiosError(error)) {
        toast({
          variant: "destructive",
          title: "Error fetching notifications",
          description: error.response?.data?.detail || "Please try again later.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error fetching notifications",
          description: "An unexpected error occurred. Please try again later.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (notification: Notification) => {
    setEditingNotificationId(notification.id);
    setEditedMessage(notification.message);
  };

  const handleSaveClick = async (notificationId: string) => {
    setLoading(true);
    try {
      await instructor.updateNotification(notificationId, { message: editedMessage });
      toast({
        title: "Notification Updated",
        description: "The notification message has been successfully updated.",
      });
      setEditingNotificationId(null);
      setEditedMessage('');
      fetchNotifications(); // Re-fetch to get the updated message
    } catch (error) {
      if (isAxiosError(error)) {
        toast({
          variant: "destructive",
          title: "Error updating notification",
          description: error.response?.data?.detail || "Please try again later.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error updating notification",
          description: "An unexpected error occurred. Please try again later.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Notifications for {sessionTitle} (Week {weekNumber})</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <p>Loading notifications...</p>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <div key={notification.id} className="border p-3 rounded-md shadow-sm">
                <p className="text-sm font-medium">User: {notification.user.name} ({notification.user.email})</p>
                {editingNotificationId === notification.id ? (
                  <div className="mt-2">
                    <Label htmlFor={`message-${notification.id}`} className="sr-only">Edit Message</Label>
                    <Textarea
                      id={`message-${notification.id}`}
                      value={editedMessage}
                      onChange={(e) => setEditedMessage(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="outline" onClick={() => setEditingNotificationId(null)} disabled={loading}>Cancel</Button>
                      <Button onClick={() => handleSaveClick(notification.id)} disabled={loading}>Save</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-gray-700">{notification.message}</p>
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(notification)} disabled={loading}>Edit</Button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>No notifications found for this session.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationModal;