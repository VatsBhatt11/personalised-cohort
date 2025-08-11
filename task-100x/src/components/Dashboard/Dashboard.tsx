
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plan } from '@/lib/api';
import { Sidebar, SidebarProvider, SidebarMenu, SidebarMenuButton } from '@/components/ui/sidebar';
import { Home, Trophy, HelpCircle, BookOpen } from 'lucide-react';
import { Resource } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import axios from 'axios';
import { QuizAttemptComponent } from './QuizAttemptComponent';
import { QuizFeedbackComponent } from './QuizFeedbackComponent';
import Leaderboard from "@/components/Dashboard/Leaderboard";
import { Badge } from '@/components/ui/badge';
import { Flame } from 'lucide-react';
import GoalSettingModal from './GoalSettingModal';
import GameRoadmap from './GameRoadmap';
import { learner, WeeklyProgress, WeekResource, QuizAttemptStatus } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { AxiosError } from 'axios';

interface DashboardProps {
  userEmail: string;
  userName:string;
}

interface StreakData {
  currentStreak: number;
  weeklyStreak?: number;
  lastCompletedDate?: string | null;
}

interface ApiError {
  detail: string;
}

const Dashboard = ({ userEmail,userName }: DashboardProps) => {
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isQuizAttemptOpen, setIsQuizAttemptOpen] = useState(false);
  const [isQuizFeedbackOpen, setIsQuizFeedbackOpen] = useState(false);
  const [quizResource, setQuizResource] = useState<Resource | null>(null);
    const [quizAttemptStatus, setQuizAttemptStatus] = useState<QuizAttemptStatus | null>(null);
  const [lastAttemptId, setLastAttemptId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<Plan | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [activeTab, setActiveTab] = useState<'challenges' | 'leaderboard'>('challenges');
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([]);
  const [allResources, setAllResources] = useState<WeekResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const { toast } = useToast();

  // Extract first name from email
  const name = userName || userEmail.split('@')[0];

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
        setStreakData(streakResponse);

        // Fetch weekly progress
        const progressResponse = await learner.getWeeklyProgress();
        setWeeklyProgress(progressResponse);

        // Fetch all resources
        const allResourcesResponse = await learner.getAllResources(cohortId);
        setAllResources(allResourcesResponse);

        // Find the quiz resource for the current week if a week is selected
        if (selectedWeek !== null) {
          const weekResources = allResourcesResponse.find(wr => wr.week === selectedWeek);
          if (weekResources) {
            const quiz = weekResources.resources.find(r => r.type === 'QUIZ');
            setQuizResource(quiz || null);
            if (quiz) {
              const response = await learner.getQuizAttemptStatus(quiz.id);
              setQuizAttemptStatus(response);
            }
          }
        }

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
  }, [selectedWeek]); // Add selectedWeek to dependency array

  const handleAttemptComplete = (attemptId: string) => {
    setLastAttemptId(attemptId);
    setIsQuizAttemptOpen(false);
    setIsQuizFeedbackOpen(true);
  };

  const handleLevelClick = async (weekId: number) => {
    setSelectedWeek(weekId);
    setIsGoalModalOpen(true);
    if (cohortId) {
      try {
        const plan = await learner.getPlan(cohortId, weekId);
        setWeeklyPlan(plan);

        // Update quiz resource and status when a new week is selected
        const weekResources = allResources.find(wr => wr.week === weekId);
        if (weekResources) {
          const quiz = weekResources.resources.find(r => r.type === 'QUIZ');
          setQuizResource(quiz || null);
          if (quiz) {
            const response = await learner.getQuizAttemptStatus(quiz.id);
            setQuizAttemptStatus(response);
          }
        }

      } catch (error) {
        console.error("Error fetching plan for selected week:", error);
        toast({
          variant: "destructive",
          title: "Error fetching plan",
          description: "Please try again later."
        });
        setWeeklyPlan(null);
      }
    }
  };





  if (isLoading) {
    return <div className="min-h-screen bg-gray-800 flex items-center justify-center">
      <div className="text-orange-500">Loading...</div>
    </div>;
  }

  if (!cohortId) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-orange-500">No active cohort found. Please contact support.</div>
    </div>;
  }

  return (
    <SidebarProvider>
      <div className="h-screen w-full bg-gray-800 relative overflow-hidden flex">
        <Sidebar className="bg-gray-900 border-r border-orange-500/30 w-64 p-4">
          <SidebarMenu className="space-y-2">
            <SidebarMenuButton 
              onClick={() => setActiveTab('challenges')} 
              isActive={activeTab === 'challenges'}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-left w-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 ${activeTab === 'challenges' ? 'bg-orange-500/20' : 'hover:bg-orange-500/10'}`}
            >
              <Home className="w-5 h-5 text-orange-400" />
              <span className="text-orange-400 font-medium">Challenges</span>
            </SidebarMenuButton>
            <SidebarMenuButton 
              onClick={() => setActiveTab('leaderboard')} 
              isActive={activeTab === 'leaderboard'}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg text-left w-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 ${activeTab === 'leaderboard' ? 'bg-orange-500/20' : 'hover:bg-orange-500/10'}`}
            >
              <Trophy className="w-5 h-5 text-orange-400" />
              <span className="text-orange-400 font-medium">Leaderboard</span>
            </SidebarMenuButton>

            <Dialog open={isQuizAttemptOpen} onOpenChange={setIsQuizAttemptOpen}>
              <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                  <DialogTitle>Quiz Attempt</DialogTitle>
                </DialogHeader>
                {quizResource && (
                  <QuizAttemptComponent
                    quizId={quizResource.id}
                    onAttemptComplete={(attemptId) => {
                      setQuizAttemptStatus({ hasAttempted: true, lastAttemptId: attemptId });
                      setIsQuizAttemptOpen(false);
                      setIsQuizFeedbackOpen(true);
                    }}
                    onClose={() => setIsQuizAttemptOpen(false)}
                  />
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={isQuizFeedbackOpen} onOpenChange={setIsQuizFeedbackOpen}>
              <DialogContent className="sm:max-w-[800px]">
                <DialogHeader>
                  <DialogTitle>Quiz Feedback</DialogTitle>
                </DialogHeader>
                {quizAttemptStatus?.lastAttemptId && (
                  <QuizFeedbackComponent attemptId={quizAttemptStatus.lastAttemptId} onClose={() => setIsQuizFeedbackOpen(false)} />
                )}
              </DialogContent>
            </Dialog>
          </SidebarMenu>
        </Sidebar>
        <div className="flex-1 flex flex-col">
        {/* Top Bar for User Info and Streak */}
        <div className="flex justify-between items-center p-4 bg-black/50 backdrop-blur-md border-b border-orange-500/30">
          <div className="text-lg font-semibold text-orange-400">Welcome, {name}!</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-orange-500 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-orange-500/30">
              <Flame className="w-5 h-5" />
              <span className="font-semibold">{streakData?.currentStreak || 0} day streak</span>
            </div>
            {streakData?.weeklyStreak !== undefined && (
              <Badge 
                variant="outline" 
                className="text-md border-cyan-500/50 text-cyan-400 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2"
              >
                {`Weekly Streak: ${streakData.weeklyStreak}`}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto flex justify-center items-center">
          {activeTab === 'challenges' && (
            <>
              <GameRoadmap
                onLevelClick={handleLevelClick}
                userName={name}
                weeklyProgress={weeklyProgress}
                allResources={allResources}
              />
              <GoalSettingModal
                isOpen={isGoalModalOpen}
                onClose={() => setIsGoalModalOpen(false)}
                selectedWeek={selectedWeek}
                cohortId={cohortId}
                weeklyPlan={weeklyPlan}
                setWeeklyPlan={setWeeklyPlan}
                allResources={allResources}
                setWeeklyProgress={setWeeklyProgress}
              />
            </>
          )}



      {activeTab === 'leaderboard' && (
        <Leaderboard />
      )}



    </div>
    </div>
    </div>
    </SidebarProvider>
  )
};

export default Dashboard;
