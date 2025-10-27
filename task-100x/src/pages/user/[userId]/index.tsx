import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { instructor } from '@/lib/api'; // Import instructor

interface IkigaiData {
  purpose: string | null;
  passion: string | null;
  profession: string | null;
  vocation: string | null;
}

interface ProjectIdeaData {
  id: string;
  title: string;
  description: string;
  chatHistory: Record<string, unknown>; // Refined type
}

interface RoadmapData {
  id: string;
  content: Record<string, unknown>; // Refined type
}

interface UserDetails {
  id: string;
  name: string;
}

const UserDetailPage = () => {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [ikigaiData, setIkigaiData] = useState<IkigaiData | null>(null);
  const [projectIdeas, setProjectIdeas] = useState<ProjectIdeaData[]>([]);
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const { userId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (userId) {
        try {
          const ikigaiRes = await instructor.getIkigai(userId as string);
          setIkigaiData(ikigaiRes);

          // Fetch project ideas
          const projectIdeasRes = await instructor.getProjectIdeas(userId as string);
          setProjectIdeas(projectIdeasRes);

          // Fetch roadmap data
          const roadmapRes = await instructor.getRoadmaps(userId as string);
          setRoadmapData(roadmapRes);

          // Set a dummy user name for display if not fetched
          setUser({ id: userId as string, name: `User ${userId}` });

        } catch (error) {
          console.error('Failed to fetch user details:', error);
        }
      }
    };
    fetchData();
  }, [userId]);

  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="container mx-auto bg-white rounded-lg shadow-md p-6">
        <Button onClick={() => navigate('/admin/self-discovery/manage')} className="mb-6 bg-orange-500 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm transition duration-150 ease-in-out">
          Back to Manage
        </Button>
        <h1 className="text-3xl font-bold mb-6 text-gray-800">{user.name} Details</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">Ikigai Data</CardTitle>
            </CardHeader>
            <CardContent>
              {ikigaiData ? (
                <pre className='whitespace-pre-wrap bg-gray-50 p-4 rounded-md text-sm text-gray-700'>{JSON.stringify(ikigaiData, null, 2)}</pre>
              ) : (
                <p className="text-gray-600">No Ikigai data available</p>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">Project Ideas</CardTitle>
            </CardHeader>
            <CardContent>
              {projectIdeas.length > 0 ? (
                <ul>
                  {projectIdeas.map(idea => (
                    <li key={idea.id} className='mb-4 p-3 border border-gray-200 rounded-md bg-gray-50 last:mb-0'>
                      <h3 className='font-semibold text-gray-800 text-lg'>{idea.title}</h3>
                      <p className="text-gray-700 mt-1">{idea.description}</p>
                      <details className='mt-3'>
                        <summary className='cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium'>View Chat History</summary>
                        <pre className='whitespace-pre-wrap text-xs bg-gray-100 p-3 rounded-md mt-2 border border-gray-200'>
                          {JSON.stringify(idea.chatHistory, null, 2)}
                        </pre>
                      </details>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No project ideas submitted</p>
              )}
            </CardContent>
          </Card>
          <Card className='md:col-span-2 shadow-sm'>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">Personalised Roadmap</CardTitle>
            </CardHeader>
            <CardContent>
              {roadmapData ? (
                <pre className='whitespace-pre-wrap bg-gray-50 p-4 rounded-md text-sm text-gray-700'>{JSON.stringify(roadmapData, null, 2)}</pre>
              ) : (
                <p className="text-gray-600">No roadmap data available</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserDetailPage;