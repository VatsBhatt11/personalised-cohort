import useAuth from '@/hooks/useAuth';
import { instructor, ProjectIdea } from '@/lib/api';
import { useEffect, useState } from 'react';

const ProjectApprovalsPage = () => {
  const {isAuthenticated, isLoading: authLoading } = useAuth();
  const [projectIdeas, setProjectIdeas] = useState<ProjectIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCohortName, setSelectedCohortName] = useState<string>(
    localStorage.getItem("cohortName") || ""
  );

  useEffect(() => {
      if (!isAuthenticated) {
        setLoading(false);
      } else {
        fetchProjectIdeas();
    }
  }, [isAuthenticated, authLoading, selectedCohortName]);

  const fetchProjectIdeas = async () => {
    try {
      setLoading(true);
      const data = await instructor.getProjectApprovals(selectedCohortName);
      setProjectIdeas(data);
    } catch (err: any) {
      setError(err.message);
      console.error("Failed to fetch project ideas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, isAccepted: boolean) => {
    try {
      await instructor.updateProjectApprovalStatus(id, isAccepted);
      fetchProjectIdeas();
    } catch (err: any) {
      setError(err.message);
      console.error(`Failed to update project idea ${id} status to ${isAccepted}:`, err);
    }
  };

  if (authLoading || loading) {
    return <div>Loading project ideas...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Project Approvals</h1>
        {projectIdeas.length === 0 ? (
          <p className="text-gray-600">No project ideas pending approval.</p>
        ) : (
          <div className="overflow-x-auto mt-4 max-h-[60vh]">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-50 sticky top-0">
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Sr No.</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Module</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Problem Statement</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Solution</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                  <th className="py-3 px-4 border-b text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projectIdeas.filter(idea => idea.problem_statement && idea.solution).map((idea, index) => (
                  <tr key={idea.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b text-sm text-gray-900">{index + 1}</td>
                    <td className="py-3 px-4 border-b text-sm text-gray-900">{idea?.profiles?.name}</td>
                    <td className="py-3 px-4 border-b text-sm text-gray-900">{idea.module_name}</td>
                    <td className="py-3 px-4 border-b text-sm text-gray-900">{idea.problem_statement}</td>
                    <td className="py-3 px-4 border-b text-sm text-gray-900">{idea.solution}</td>
                    <td className="py-3 px-4 border-b text-sm text-gray-900">{new Date(idea.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 border-b text-sm text-gray-900">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleUpdateStatus(idea.id, true)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm transition duration-150 ease-in-out"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(idea.id, false)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition duration-150 ease-in-out"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectApprovalsPage;