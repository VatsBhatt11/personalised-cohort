import React, { useState, useEffect, useRef } from 'react';
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
  lectureNumber: number;
  imageUrl?: string;
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
  const [lectureNumber, setLectureNumber] = useState<number>(1);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSession) {
      setSessionTitle(editingSession.title);
      setSessionDescription(editingSession.description);
      setSessionWeekNumber(editingSession.weekNumber);
      setLectureNumber(editingSession.lectureNumber);
      setImageUrl(editingSession.imageUrl || '');
      setSelectedImage(null);
    } else {
      setSessionTitle('');
      setSessionDescription('');
      setSessionWeekNumber(1);
      setLectureNumber(1);
      setImageUrl('');
      setSelectedImage(null);
    }
  }, [editingSession]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!sessionTitle || !sessionDescription || !sessionWeekNumber || !lectureNumber) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in all required fields.",
      });
      return;
    }

    setLoading(true);
    try {
      let uploadedImageUrl = imageUrl;

      if (selectedImage) {
        const formData = new FormData();
        formData.append('file', selectedImage);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Image upload failed');
        }

        const data = await response.json();
        uploadedImageUrl = data.url;
      }

      const sessionData = {
        title: sessionTitle,
        description: sessionDescription,
        weekNumber: sessionWeekNumber,
        lectureNumber: lectureNumber,
        imageUrl: uploadedImageUrl || undefined,
        cohortId,
      };

      if (editingSession) {
        await instructor.updateSession(editingSession.id, sessionData);
        toast({
          title: "Success",
          description: "Session updated successfully.",
        });
      } else {
        await instructor.createSession(cohortId, sessionData);
        toast({
          title: "Success",
          description: "Session created successfully.",
        });
      }

      onSessionCreated();
      onClose();
    } catch (error) {
      console.error('Failed to save session:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.detail || "An error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] glass border-orange-600/20 rounded-2xl bg-orange-100 text-black shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-orange-400">Manage Sessions</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <h3 className="text-lg font-semibold text-orange-400">{editingSession ? 'Edit Session' : 'Create New Session'}</h3>
          <div className="space-y-2">
            <Label htmlFor="sessionTitle" className="text-orange-400">Session Title</Label>
            <Input
              id="sessionTitle"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="e.g., Introduction to React"
              className="bg-orange-50 border border-orange-600/50 text-black px-4 py-2 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all duration-200 ease-in-out placeholder:text-gray-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionDescription" className="text-orange-400">Session Description</Label>
            <Input
              id="sessionDescription"
              value={sessionDescription}
              onChange={(e) => setSessionDescription(e.target.value)}
              placeholder="e.g., A deep dive into React hooks"
              className="bg-orange-50 border border-orange-600/50 text-black px-4 py-2 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all duration-200 ease-in-out placeholder:text-gray-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionWeekNumber" className="text-orange-400">Week Number</Label>
            <Select
              value={String(sessionWeekNumber)}
              onValueChange={(value) => setSessionWeekNumber(parseInt(value))}
            >
              <SelectTrigger id="sessionWeekNumber" className="w-full p-3 border border-orange-600/30 rounded-xl bg-orange-50 text-black focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 ease-in-out shadow-lg hover:border-orange-400">
                <SelectValue placeholder="Select a week" />
              </SelectTrigger>
              <SelectContent className="bg-orange-50 text-black border border-orange-600/30 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
                  <SelectItem key={week} value={String(week)} className="hover:bg-orange-600/20 focus:bg-orange-600/20 cursor-pointer py-2 px-4 transition-colors duration-200 ease-in-out text-black">
                    Week {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lectureNumber" className="text-orange-400">Lecture Number</Label>
            <Select
              value={String(lectureNumber)}
              onValueChange={(value) => setLectureNumber(parseInt(value))}
            >
              <SelectTrigger id="lectureNumber" className="w-full p-3 border border-orange-600/30 rounded-xl bg-orange-50 text-black focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 ease-in-out shadow-lg hover:border-orange-400">
                <SelectValue placeholder="Select a lecture" />
              </SelectTrigger>
              <SelectContent className="bg-orange-50 text-black border border-orange-600/30 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {Array.from({ length: 7 }, (_, i) => i + 1).map((lecture) => (
                  <SelectItem key={lecture} value={String(lecture)} className="hover:bg-orange-600/20 focus:bg-orange-600/20 cursor-pointer py-2 px-4 transition-colors duration-200 ease-in-out text-black">
                    Lecture {lecture}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="imageUrl" className="text-orange-400">Image URL</Label>
            <Input
              id="imageUrl"
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              Upload Image
            </Button>
            {imageUrl && <img src={imageUrl} alt="Session Preview" className="mt-2 w-full h-auto rounded-lg" />}
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 ease-in-out">
            {loading ? (editingSession ? 'Updating...' : 'Submitting...') : (editingSession ? 'Update Session' : 'Create Session')}
          </Button>
          {editingSession && (
            <Button variant="outline" onClick={() => {
              onClose(); // This will trigger the useEffect to reset the form
            }} className="border-orange-600/50 text-black hover:bg-orange-600/20 rounded-xl shadow-lg transition-all duration-200 ease-in-out">
              Cancel Edit
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionManagementModal;