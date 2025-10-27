import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { instructor, UserWithBalanceAndIdeas } from '@/lib/api';

interface UserData {
  id: string;
  name: string;
  email: string;
}

interface CohortData {
  id: string;
  name: string;
}

const ManageSelfDiscoveryPage = () => {
  const [cohortId, setCohortId] = useState<string>('');
  const [users, setUsers] = useState<UserData[]>([]);
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const data = await instructor.getCohorts();
        setCohorts(data);
        const storedCohortName = localStorage.getItem('selectedCohortName');
        if (storedCohortName) {
          const selectedCohort = data.find(cohort => cohort.name === storedCohortName);
          if (selectedCohort) {
            setCohortId(selectedCohort.id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch cohorts:', error);
      }
    };
    fetchCohorts();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      const cohortName = localStorage.getItem('selectedCohortName');
      if (cohortName) {
        try {
          const data = await instructor.getUsersByCohort(cohortName);
          setUsers(data);
        } catch (error) {
          console.error('Failed to fetch users:', error);
          setUsers([]);
        }
      }
    };
    fetchUsers();
  }, [cohortId]); // cohortId is still a dependency because it triggers the fetchUsers when a new cohort is selected from the dropdown

  const handleCohortChange = (selectedCohortId: string) => {
    const selectedCohort = cohorts.find(cohort => cohort.id === selectedCohortId);
    if (selectedCohort) {
      localStorage.setItem('selectedCohortName', selectedCohort.name);
      setCohortId(selectedCohortId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Manage Cohort Users</h1>
        <div className="mb-6">
          <Select onValueChange={handleCohortChange} value={cohortId}>
            <SelectTrigger className='w-64'>
              <SelectValue placeholder='Select a cohort' />
            </SelectTrigger>
            <SelectContent>
              {cohorts.map((cohort) => (
                <SelectItem key={cohort.id} value={cohort.id}>
                  {cohort.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto mt-4 max-h-[60vh]">
          <Table aria-label='Users in cohort' className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
            <TableHeader className="sticky top-0 bg-gray-50">
              <TableRow>
                <TableHead className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Name</TableHead>
                <TableHead className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user: UserData) => (
                <TableRow key={user.id} className="hover:bg-gray-50">
                  <TableCell className="py-3 px-4 border-b text-sm text-gray-900">{user.name}</TableCell>
                  <TableCell className="py-3 px-4 border-b text-sm text-gray-900">
                    <Button onClick={() => navigate(`/admin/user/${user.id}`)} className="bg-custom-orange hover:bg-orange-700 text-white px-3 py-1 rounded-md text-sm transition duration-150 ease-in-out">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default ManageSelfDiscoveryPage;