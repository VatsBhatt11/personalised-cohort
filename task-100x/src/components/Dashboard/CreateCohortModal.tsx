import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { instructor, Cohort } from '@/lib/api';
import axios, { AxiosError } from 'axios';
import { Loader2 } from 'lucide-react';

interface CreateCohortModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCohortCreated: (cohortId: string) => void;
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
      const newCohort: Cohort = await instructor.createCohort(formData);

      toast({
        title: "Cohort created successfully!",
        description: `Cohort '${newCohort.name}' with ${newCohort.totalWeeks} weeks has been created.`
      });
      onCohortCreated(newCohort.id);
      onClose();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ detail: string }>;
        toast({
          variant: "destructive",
          title: "Error creating cohort",
          description: axiosError.response?.data?.detail || "Please try again later."
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
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full bg-gray-800 text-white border-gray-700 rounded-lg shadow-lg">
        <DialogHeader className="border-b border-gray-700 pb-4 mb-4">
          <DialogTitle className="text-2xl font-bold text-orange-400">Create New Cohort</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 justify-start items-center gap-4">
            <Label htmlFor="cohortName" className="col-span-1 text-left text-gray-300">
              Cohort Name
            </Label>
            <Input
              id="cohortName"
              value={cohortName}
              onChange={(e) => setCohortName(e.target.value)}
              className="col-span-3 bg-gray-700 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500"
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="totalWeeks" className="col-span-1 text-left text-gray-300">
              Total Weeks
            </Label>
            <Input
              id="totalWeeks"
              type="number"
              value={totalWeeks}
              onChange={(e) => setTotalWeeks(parseInt(e.target.value) || 0)}
              className="col-span-3 bg-gray-700 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500"
              min="1"
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-6 items-center gap-4">
            <Label htmlFor="csvFile" className="col-span-3 text-left text-gray-300">
              Upload Launchpad data (CSV)
            </Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="col-span-3 bg-gray-700 border-gray-600 text-white focus:border-orange-500 focus:ring-orange-500 file:text-orange-400 file:bg-gray-700 file:border-0 file:rounded-md file:font-medium hover:file:bg-gray-600"
              disabled={loading}
            />
          </div>
        </div>
        <DialogFooter className="border-t border-gray-700 pt-4 mt-4 flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose} disabled={loading} className="bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:text-white transition duration-300 ease-in-out">
            Cancel
          </Button>
          <Button onClick={handleCreateCohort} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Cohort
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCohortModal;