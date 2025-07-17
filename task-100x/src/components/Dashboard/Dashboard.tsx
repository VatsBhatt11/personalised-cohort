
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Flame } from 'lucide-react';
import GoalSettingModal from './GoalSettingModal';
import GameRoadmap from './GameRoadmap';
import { learner, WeeklyProgress, WeekResource } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { AxiosError } from 'axios';

interface DashboardProps {
  userEmail: string;
}

interface ApiError {
  detail: string;
}

const Dashboard = ({ userEmail }: DashboardProps) => {
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [hasGoals, setHasGoals] = useState(false);
  const [streak, setStreak] = useState(0);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([]);
  const [allResources, setAllResources] = useState<WeekResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const { toast } = useToast();

  // Extract first name from email
  const userName = userEmail.split('@')[0];

  useEffect(() => {
    const fetchUserCohort = async () => {
      try {
        const response = await learner.getCurrentCohort();
        if (response.id) {
          setCohortId(response.id);
          return response.id;
        }
        return null;
      } catch (error) {
        const axiosError = error as AxiosError<ApiError>;
        toast({
          title: 'Error',
          description: axiosError.response?.data?.detail || 'Failed to fetch cohort information',
          variant: 'destructive',
        });
        return null;
      }
    };

    const fetchDashboardData = async (cohortId: string | null) => {
      if (!cohortId) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch streak data
        const streakResponse = await learner.getStreak();
        setStreak(streakResponse.currentStreak);

        // Fetch weekly progress
        const progressResponse = await learner.getWeeklyProgress();
        setWeeklyProgress(progressResponse);

        // Fetch all resources
        const allResourcesResponse = await learner.getAllResources(cohortId);
        setAllResources(allResourcesResponse);

        // Check if user has any goals set
        const planResponse = await learner.getPlan(cohortId);
        const hasAnyGoals = planResponse.some(plan => plan.tasks && plan.tasks.length > 0);
        setHasGoals(hasAnyGoals);
        console.log("fetchDashboardData: cohortId=", cohortId, "planResponse=", planResponse, "hasAnyGoals=", hasAnyGoals); // Added console log
      } catch (error) {
        console.error(error);
        const axiosError = error as AxiosError<ApiError>;
        toast({
          title: 'Error',
          description: axiosError.response?.data?.detail || 'Failed to load dashboard data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    const initializeDashboard = async () => {
      const cohortId = await fetchUserCohort();
      await fetchDashboardData(cohortId);
    };

    initializeDashboard();
  }, []);

  const handleLevelClick = async (weekId: number) => {
    setSelectedWeek(weekId);
    if (cohortId) {
      try {
        const planResponse = await learner.getPlan(cohortId);
        const hasTasksForSelectedWeek = planResponse.some(plan => 
          plan.tasks && plan.tasks.some(task => task.resource.weekNumber === weekId)
        );
        console.log(`hasTasks: ${hasTasksForSelectedWeek}`);
        setHasGoals(hasTasksForSelectedWeek || false);
      } catch (error) {
        console.error("Error fetching plan for selected week:", error);
        setHasGoals(false);
      }
    } else {
      setHasGoals(false); // If no cohortId, assume no goals
    }
    setIsGoalModalOpen(true);
  };

console.log(hasGoals)

  const handleGoalsSet = async () => {
    if (!cohortId) {
      toast({
        title: 'Error',
        description: 'No active cohort found',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      setHasGoals(true);
      setIsGoalModalOpen(false);
      console.log("After setting goals: hasGoals=", true, "isGoalModalOpen=", false); // Added console log
      
      toast({
        title: 'Success',
        description: 'Learning goals have been set!',
      });

      // Refresh weekly progress
      const progressResponse = await learner.getWeeklyProgress();
      setWeeklyProgress(progressResponse);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      toast({
        title: 'Error',
        description: axiosError.response?.data?.detail || 'Failed to set goals',
        variant: 'destructive',
      });
      setHasGoals(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-orange-500">Loading...</div>
    </div>;
  }

  if (!cohortId) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-orange-500">No active cohort found. Please contact support.</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Streak Counter - Top Right */}
      <div className="absolute top-6 right-6 z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-orange-500 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-orange-500/30">
            <Flame className="w-5 h-5" />
            <span className="font-semibold">{streak} day streak</span>
          </div>
          <Badge 
            variant="outline" 
            className="border-cyan-500/50 text-cyan-400 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1"
          >
            {`Level ${Math.floor(streak / 7) + 1} Learner`}
          </Badge>
        </div>
      </div>

      {/* Game Roadmap - Full Screen */}
      <GameRoadmap 
        onLevelClick={handleLevelClick} 
        userName={userName} 
        weeklyProgress={weeklyProgress}
        allResources={allResources}
      />

      {/* Goal Setting Modal */}
      <GoalSettingModal 
        isOpen={isGoalModalOpen} 
        onClose={() => setIsGoalModalOpen(false)}
        showGoalForm={!hasGoals}
        selectedWeek={selectedWeek}
        onGoalsSet={handleGoalsSet}
      />
    </div>
  );
};

export default Dashboard;
