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
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
      <Card className="w-full max-w-md bg-orange-100 border border-orange-200 rounded-xl shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-bold text-orange-600 text-center">Select or Create Cohort</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center text-orange-600">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-3 text-lg">Loading cohorts...</span>
            </div>
          ) : cohorts.length > 0 ? (
            <div className="space-y-3">
              <label htmlFor="cohort-select" className="block text-lg font-medium text-black">
                Select an existing cohort:
              </label>
              <select
                id="cohort-select"
                className="mt-1 block w-full pl-4 pr-10 py-3 text-base bg-orange-50 border border-orange-200 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-lg transition-colors duration-200"
                onChange={(e) =>{
                  setCohortId(e.target.value)
                }}
                defaultValue=""
              >
                <option value="" disabled className="text-gray-500">-- Select Cohort --</option>
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id} className="text-black bg-orange-50">
                    {cohort.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-center text-black text-lg">No cohorts found. Please create a new one.</p>
          )}
          <Button
            className="w-full px-8 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            onClick={() => setIsCreateCohortModalOpen(true)}
          >
            Create New Cohort
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}