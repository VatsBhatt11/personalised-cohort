import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { instructor } from '@/lib/api';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

interface CreateCohortModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCohortCreated: (cohortId: string) => void;
}

interface ApiError {
  detail: string;
}

const CreateCohortModal: React.FC<CreateCohortModalProps> = ({ isOpen, onClose, onCohortCreated }) => {
  const [cohortName, setCohortName] = useState('');
  const [totalWeeks, setTotalWeeks] = useState<number>(12);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setCsvFile(event.target.files[0]);
    }
  };

  const handleCreateCohort = async () => {
    if (!cohortName.trim()) {
      toast({
        variant: "destructive",
        title: "Cohort name is required",
        description: "Please enter a name for the new cohort."
      });
      return;
    }
    if (totalWeeks <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid total weeks",
        description: "Total weeks must be a positive number."
      });
      return;
    }
    if (!csvFile) {
      toast({
        variant: "destructive",
        title: "CSV file is required",
        description: "Please upload a CSV file with user data."
      });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('cohort_name', cohortName);
    formData.append('total_weeks', totalWeeks.toString());
    formData.append('csv_file', csvFile);

    try {
      const response = await axios.post('http://localhost:8000/instructor/cohorts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Assuming token is stored in localStorage
        }
      });
      const newCohort = response.data.data; // Adjust based on your API response structure

      toast({
        title: "Cohort created successfully!",
        description: `Cohort '${newCohort.name}' with ${newCohort.totalWeeks} weeks has been created.`
      });
      onCohortCreated(newCohort.id);
      onClose();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error.response?.data as ApiError;
        toast({
          variant: "destructive",
          title: "Error creating cohort",
          description: axiosError?.detail || "Please try again later."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error creating cohort",
          description: "An unexpected error occurred. Please try again later."
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Cohort</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cohortName" className="text-right">
              Cohort Name
            </Label>
            <Input
              id="cohortName"
              value={cohortName}
              onChange={(e) => setCohortName(e.target.value)}
              className="col-span-3"
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="totalWeeks" className="text-right">
              Total Weeks
            </Label>
            <Input
              id="totalWeeks"
              type="number"
              value={totalWeeks}
              onChange={(e) => setTotalWeeks(parseInt(e.target.value) || 0)}
              className="col-span-3"
              min="1"
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="csvFile" className="text-right">
              Upload CSV
            </Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="col-span-3"
              disabled={loading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreateCohort} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Cohort
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCohortModal;