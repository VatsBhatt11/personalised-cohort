import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CohortSelectionProps = {
  cohorts: {
    id: string;
    name: string;
  }[];
  loading: boolean;
  setCohortId: (id: string) => void;
  setIsCreateCohortModalOpen: (open: boolean) => void;
  hasSelectedCohort: boolean;
};

export function CohortSelection({
  cohorts,
  loading,
  setCohortId,
  setIsCreateCohortModalOpen,
  hasSelectedCohort,
}: CohortSelectionProps) {
  if (hasSelectedCohort) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Select or Create Cohort</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading cohorts...</span>
            </div>
          ) : cohorts.length > 0 ? (
            <div className="space-y-2">
              <label htmlFor="cohort-select" className="block text-sm font-medium text-gray-700">
                Select an existing cohort:
              </label>
              <select
                id="cohort-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                onChange={(e) => setCohortId(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>-- Select Cohort --</option>
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-center text-gray-500">No cohorts found. Please create a new one.</p>
          )}
          <Button
            className="w-full"
            onClick={() => setIsCreateCohortModalOpen(true)}
          >
            Create New Cohort
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}