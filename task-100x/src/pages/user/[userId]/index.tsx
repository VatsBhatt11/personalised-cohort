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
          // Fetch user details (if needed, otherwise user.name can come from manage page)
          // For now, we'll assume user details are not directly fetched here unless necessary

          // Fetch Ikigai data
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
    <div className='p-6'>
      <Button onClick={() => navigate('/admin/self-discovery/manage')} className='mb-6'>
        Back to Manage
      </Button>
      <h1 className='text-2xl font-bold mb-6'>{user.name} Details</h1>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <Card>
          <CardHeader>
            <CardTitle>Ikigai Data</CardTitle>
          </CardHeader>
          <CardContent>
            {ikigaiData ? (
              <pre className='whitespace-pre-wrap'>{JSON.stringify(ikigaiData, null, 2)}</pre>
            ) : (
              <p>No Ikigai data available</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Project Ideas</CardTitle>
          </CardHeader>
          <CardContent>
            {projectIdeas.length > 0 ? (
              <ul>
                {projectIdeas.map(idea => (
                  <li key={idea.id} className='mb-2'>
                    <h3 className='font-semibold'>{idea.title}</h3>
                    <p>{idea.description}</p>
                    <details className='mt-1'>
                      <summary className='cursor-pointer text-sm text-blue-600'>View Chat History</summary>
                      <pre className='whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded'>
                        {JSON.stringify(idea.chatHistory, null, 2)}
                      </pre>
                    </details>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No project ideas submitted</p>
            )}
          </CardContent>
        </Card>
        <Card className='md:col-span-2'>
          <CardHeader>
            <CardTitle>Personalised Roadmap</CardTitle>
          </CardHeader>
          <CardContent>
            {roadmapData ? (
              <pre className='whitespace-pre-wrap'>{JSON.stringify(roadmapData, null, 2)}</pre>
            ) : (
              <p>No roadmap data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserDetailPage;