import React, { useState, useEffect } from 'react';
import { instructor } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronLeft, Home, Bell } from 'lucide-react';

interface Notification {
  id: string;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    launchpad?: {
    studyStream: string;
    expectedOutcomes: string;
  }
  };
  session?: {
    id: string;
    title: string;
    weekNumber: number;
  };
}

const NotificationsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [editingNotificationId, setEditingNotificationId] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (sessionId) {
      fetchNotifications(sessionId);
    }
  }, [sessionId]);

  const fetchNotifications = async (id: string) => {
    setLoading(true);
    try {
      const response = await instructor.getSessionNotifications(id);
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
      
      // Re-fetch notifications based on whether we're viewing all or session-specific
      if (sessionId) {
        fetchNotifications(sessionId);
      }
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

  if (loading && notifications.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="bg-white p-2">
      <Card className="bg-white border border-orange-200 rounded-xl shadow-lg overflow-hidden">
        <CardHeader className="p-4 bg-gradient-to-r from-orange-500 to-orange-400 text-white">
          <CardTitle className="text-2xl font-semibold flex items-center gap-6">
            <div className="flex items-center">
              <Link to="/" className="flex items-center bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
                <ChevronLeft className="h-8 w-8" />
              </Link>
            </div>
            {notifications.length > 0 && notifications[0].session ? (
              <>Notifications: {notifications[0].session.title} (Week {notifications[0].session.weekNumber})</>
            ) : (
              <>{sessionId ? "Session Notifications" : "All Notifications"}</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <div>
              <Table>
                <TableHeader className="bg-orange-50">
                  <TableRow>
                    <TableHead className="font-bold">User</TableHead>
                    <TableHead className="text-center font-bold">Study Stream</TableHead>
                    <TableHead className="font-bold">Expected Outcomes</TableHead>
                    <TableHead className="font-bold">Notification Message</TableHead>
                    <TableHead className="text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              </Table>
              <div className="overflow-auto max-h-[80dvh]">
                <Table>
                  <TableBody>
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <TableRow key={notification.id} className="transition-colors">
                      <TableCell className="p-2 font-medium">
                        <div className="max-w-xs text-black font-semibold">{notification.user.name || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="max-w-sm text-black">{notification?.user?.launchpad?.studyStream || 'N/A'}</TableCell>
                      <TableCell className="max-w-sm text-black">{notification?.user?.launchpad?.expectedOutcomes || 'N/A'}</TableCell>
                      <TableCell className="w-lg">
                        {editingNotificationId === notification.id ? (
                          <div>
                            <Label htmlFor={`message-${notification.id}`} className="sr-only">Edit Message</Label>
                            <Textarea
                              id={`message-${notification.id}`}
                              value={editedMessage}
                              onChange={(e) => setEditedMessage(e.target.value)}
                              className="text-black mt-1 bg-white border-orange-200 focus:border-orange-500 focus:ring-orange-500"
                              rows={4}
                            />
                          </div>
                        ) : (
                          <div className="text-black whitespace-pre-wrap p-2 bg-orange-50 rounded-md border border-orange-100">{notification.message}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingNotificationId === notification.id ? (
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              onClick={() => setEditingNotificationId(null)} 
                              disabled={loading}
                              className="bg-white hover:bg-gray-100 border-orange-200"
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={() => handleSaveClick(notification.id)} 
                              disabled={loading}
                              className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving
                                </>
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleEditClick(notification)} 
                            disabled={loading}
                            className="bg-white hover:bg-orange-50 border-orange-200 text-orange-600 hover:text-orange-700"
                          >
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Bell className="h-8 w-8 text-orange-300" />
                        <p className="text-gray-500">No notifications found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsPage;