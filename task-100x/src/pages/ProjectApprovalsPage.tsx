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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Project Approvals</h1>
      {
        projectIdeas.length === 0 ? (
          <p>No project ideas pending approval.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Sr No.</th>
                  <th className="py-2 px-4 border-b">Name</th>
                  <th className="py-2 px-4 border-b">Module</th>
                  <th className="py-2 px-4 border-b">Problem Statement</th>
                  <th className="py-2 px-4 border-b">Solution</th>
                  <th className="py-2 px-4 border-b">Created At</th>
                  <th className="py-2 px-4 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projectIdeas.map((idea,index) => (
                  <tr key={idea.id}>
                    <td className="py-2 px-4 border-b">{index + 1}</td>
                    <td className="py-2 px-4 border-b">{idea?.profiles?.name}</td>
                    <td className="py-2 px-4 border-b">{idea.module_name}</td>
                    <td className="py-2 px-4 border-b">{idea.problem_statement}</td>
                    <td className="py-2 px-4 border-b">{idea.solution}</td>
                    <td className="py-2 px-4 border-b">{new Date(idea.created_at).toLocaleString()}</td>
                    <td className="py-2 px-4 border-b">
                      <button
                        onClick={() => handleUpdateStatus(idea.id, true)}
                        className="bg-green-500 text-white px-3 py-1 rounded mr-2"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(idea.id, false)}
                        className="bg-red-500 text-white px-3 py-1 rounded"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
};

export default ProjectApprovalsPage;