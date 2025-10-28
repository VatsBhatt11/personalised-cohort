import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { instructor } from '@/lib/api'; // Import instructor and ProjectIdea
import { IkigaiChartDisplay } from '@/components/ikigai-chart-display';
import { RoadmapItem, GroupedRoadmap } from '@/lib/roadmap-types';

interface IkigaiData {
  what_you_love: string;
  what_you_are_good_at: string;
  what_world_needs: string;
  what_you_can_be_paid_for: string;
  your_ikigai: string;
  explanation: string;
  next_steps: string;
}

interface ProjectIdeaData {
  id: string;
  user_id: string;
  module_name: string;
  problem_statement: string;
  rationale: string | null;
  is_accepted: boolean;
  created_at: string;
  solution: string;
  features: string;
  updated_at: string;
  user_name: string;
  chat_history?: Record<string, unknown>;
}

interface RoadmapData {
  id: string;
  content: Record<string, unknown>; // Refined type
}

interface UserDetails {
  id: string;
  name: string;
  email: string;
  image: string;
  ikigaiData: IkigaiData;
  projectIdeas: ProjectIdeaData[];
  roadmapData: RoadmapData | null;
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
          setIkigaiData(ikigaiRes.ikigai_details || {});

          // Fetch project ideas
          const projectIdeasRes = await instructor.getProjectIdeas(userId as string);
          setProjectIdeas(projectIdeasRes);

          // Fetch roadmap data
          const roadmapRes = await instructor.getRoadmaps(userId as string);
          setRoadmapData(roadmapRes);

          // Set a dummy user name for display if not fetched
          setUser({
            id: userId as string,
            name: `User ${userId}`,
            email: '',
            image: '',
            ikigaiData: {},
            projectIdeas: [],
            roadmapData: null,
          });

        } catch (error) {
          console.error('Failed to fetch user details:', error);
        }
      }
    };
    fetchData();
  }, [userId]);

  const groupRoadmap = (data: RoadmapItem[]): GroupedRoadmap => {
    return data.reduce((acc: GroupedRoadmap, item) => {
      if (!acc[item.module_name]) {
        acc[item.module_name] = {};
      }
      if (!acc[item.module_name][item.week_number]) {
        acc[item.module_name][item.week_number] = {};
      }
      if (!acc[item.module_name][item.week_number][item.session_name]) {
        acc[item.module_name][item.week_number][item.session_name] = [];
      }
      acc[item.module_name][item.week_number][item.session_name].push(item);
      return acc;
    }, {});
  };

  const groupedRoadmap = roadmapData ? groupRoadmap(roadmapData) : {};

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Details: {user.name}</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Ikigai Data</h2>
        {ikigaiData ? (
          <IkigaiChartDisplay ikigaiData={ikigaiData} />
        ) : (
          <p className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap">
            No Ikigai data available
          </p>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Project Ideas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectIdeas &&
            projectIdeas
              .filter(
                (idea) =>
                  idea.is_accepted &&
                  idea.problem_statement &&
                  idea.solution
              )
              .map((idea) => (
                <div key={idea.id} className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-2">
                    {idea.problem_statement}
                  </h3>
                  <p className="text-gray-600">{idea.solution}</p>
                  <p className="text-gray-700">
                    <strong>Module:</strong> {idea.module_name}
                  </p>
                  {idea.rationale && (
                    <p className="text-gray-700">
                      <strong>Rationale:</strong> {idea.rationale}
                    </p>
                  )}
                  <p className="text-gray-700">
                    <strong>Features:</strong> {idea.features}
                  </p>
                </div>
              ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Roadmap Data</h2>
        {Object.keys(groupedRoadmap).length > 0 ? (
          Object.entries(groupedRoadmap).map(([moduleName, weeks]) => (
            <div key={moduleName} className="mb-6">
              <h3 className="text-lg font-bold mb-3">Module: {moduleName}</h3>
              {Object.entries(weeks).map(([week, sessions]) => (
                <div key={week} className="ml-4 mt-2 border-l-2 border-gray-300 pl-4">
                  <h4 className="text-md font-medium mb-1">Week: {week}</h4>
                  {Object.entries(sessions).map(([sessionName, items]) => (
                    <div key={sessionName} className="ml-4 mt-1 border-l-2 border-gray-200 pl-4">
                      <p className="font-normal">Session: {sessionName}</p>
                      <ul className="list-disc list-inside ml-4">
                        {items.map((item, index) => (
                          <li key={index}>
                            <p><strong>Project Based:</strong> {item.project_based_msg}</p>
                            <p><strong>Outcome Based:</strong> {item.outcome_based_msg}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))
        ) : (
          <p className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap">
            No roadmap data available
          </p>
        )}
      </div>
    </div>
  );
};

export default UserDetailPage;