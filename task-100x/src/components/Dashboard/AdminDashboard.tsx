
import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Award, TrendingUp, Edit, Trash2, Loader2, HelpCircle } from 'lucide-react';
import QuizForm from './QuizForm';
import QuizCard from './QuizCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import AdminResourceModal from './AdminResourceModal';
import CreateCohortModal from './CreateCohortModal';
import QuizManagementComponent, { Quiz } from './QuizManagementComponent';
import { CohortSelection } from './CohortSelection';
import { useToast } from '@/components/ui/use-toast';
import { instructor, learner, WeekResource } from '@/lib/api';
import axios, { isAxiosError, type AxiosError } from 'axios';

interface Resource {
  id?: string;
  title: string;
  type: 'VIDEO' | 'ARTICLE' | 'DOCUMENT';
  url: string;
  duration: number;
  tags: string[];
  isOptional?: boolean;
}

 interface AdminDashboardProps {
  userEmail: string;
}

interface ApiError {
  detail: string;
}

interface DashboardStats {
  total_learners: number;
  total_resources: number;
  completion_percentage: number;
  average_streak: number;
}

interface Cohort {
  id: string;
  name: string;
  totalWeeks: number;
}

const AdminDashboard = ({ userEmail }: AdminDashboardProps) => {
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isQuizManagementOpen, setIsQuizManagementOpen] = useState(false);
  const [selectedWeekForEdit, setSelectedWeekForEdit] = useState<number | null>(null);
  const [assignedWeeks, setAssignedWeeks] = useState<WeekResource[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    total_learners: 0,
    total_resources: 0,
    completion_percentage: 0,
    average_streak: 0,
  });
  const [loading, setLoading] = useState(false);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [hasSelectedCohort, setHasSelectedCohort] = useState<boolean>(false);
  const [isCreateCohortModalOpen, setIsCreateCohortModalOpen] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const { toast } = useToast();

  const fetchQuizzes = useCallback(async (selectedCohortId: string | null) => {
    if (!selectedCohortId) return; // Don't fetch if no cohort is selected
    try {
      const response = await instructor.getQuizzes(selectedCohortId);
      setQuizzes(response);
    } catch (error) {
      if (isAxiosError(error)) {
        toast({
          variant: "destructive",
          title: "Error fetching quizzes",
          description: error.response?.data?.detail || "Please try again later.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error fetching quizzes",
          description: "An unexpected error occurred. Please try again later.",
        });
      }
    }
  }, [toast]);

  useEffect(() => {
    if (cohortId) {
      fetchQuizzes(cohortId);
    }
  }, [fetchQuizzes, cohortId]);

  const fetchCohorts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await instructor.getCohorts();
      setCohorts(response);
      if (response.length > 0) {
        // Optionally pre-select the first cohort or prompt user to select
        // For now, we'll just load them.
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error.response?.data as ApiError;
        toast({
          variant: "destructive",
          title: "Error fetching cohorts",
          description: axiosError?.detail || "Please try again later."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error fetching cohorts",
          description: "An unexpected error occurred. Please try again later."
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (userEmail) {
      fetchCohorts();
    }
  }, [fetchCohorts, userEmail]);

  useEffect(() => {
    if (cohortId) {
      setHasSelectedCohort(true);
    } else {
      setHasSelectedCohort(false);
    }
  }, [cohortId]);

  const handleCreateQuiz = () => {
    if (!cohortId) {
      toast({
        variant: "destructive",
        title: "No Cohort Selected",
        description: "Please select a cohort before creating a quiz.",
      });
      return;
    }
    setCurrentQuiz({
        questions: [
          {
            questionText: '',
            questionType: 'MULTIPLE_CHOICE',
            options: [],
          },
        ],
        cohortId: cohortId,
        weekNumber: 1,
      });
    setIsModalOpen(true);
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setIsModalOpen(true);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) {
      return;
    }
    try {
      await instructor.deleteQuiz(quizId);
      toast({
        title: "Quiz deleted",
        description: "The quiz has been successfully deleted.",
      });
      fetchQuizzes(cohortId);
    } catch (error) {
      if (isAxiosError(error)) {
        toast({
          variant: "destructive",
          title: "Error deleting quiz",
          description: error.response?.data?.detail || "Please try again later.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error deleting quiz",
          description: "An unexpected error occurred. Please try again later.",
        });
      }
    }
  };

  const handleSaveQuiz = async (quizData: Quiz) => {
    try {
      console.log("Payload sent to backend:", quizData);
      if (quizData.id) {
        await instructor.updateQuiz(quizData.id, quizData);
        toast({
          title: "Quiz updated",
          description: "The quiz has been successfully updated.",
        });
      } else {
        await instructor.createQuiz(quizData);
        toast({
          title: "Quiz created",
          description: "The quiz has been successfully created.",
        });
      }
      fetchQuizzes(cohortId);
      setIsModalOpen(false);
    } catch (error) {
      if (isAxiosError(error)) {
        toast({
          variant: "destructive",
          title: `Error ${quizData.id ? 'updating' : 'creating'} quiz`,
          description: error.response?.data?.detail || "Please try again later.",
        });
      } else {
        toast({
          variant: "destructive",
          title: `Error ${quizData.id ? 'updating' : 'creating'} quiz`,
          description: "An unexpected error occurred. Please try again later.",
        });
      }
    }
  };

const fetchResources = async () => {
      try {
        const response = await instructor.getAllResources(cohortId);
        setAssignedWeeks(response);
      } catch (error) {
        if (isAxiosError(error)) {
          const axiosError = error.response?.data as ApiError;
          toast({
            variant: "destructive",
            title: "Error fetching resources",
            description: axiosError?.detail || "Please try again later."
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error fetching resources",
            description: "An unexpected error occurred. Please try again later."
          });
        }
      }
    };

  // Existing useEffect for fetching dashboard data and resources
  useEffect(() => {
    if (!cohortId) return;

    const fetchDashboardData = async () => {
      try {
        const response = await instructor.getDashboard(cohortId);
        setDashboardStats({
          total_learners: response.total_learners ?? 0,
           total_resources: response.total_resources ?? 0,
           completion_percentage: response.completion_percentage ?? 0,
           average_streak: response.average_streak ?? 0
        });
      } catch (error) {
        console.error(error)
        if (isAxiosError(error)) {
          const axiosError = error.response?.data as ApiError;
          toast({
            variant: "destructive",
            title: "Error fetching dashboard data",
            description: axiosError?.detail || "Please try again later."
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error fetching dashboard data",
            description: "An unexpected error occurred. Please try again later."
          });
        }

      }
    };

    fetchDashboardData();
    fetchResources();
  }, [cohortId]);

  const stats = [
    { title: 'Total Learners', value: dashboardStats.total_learners.toString(), icon: Users, change: '+12%' },
    { title: 'Total Resources', value: dashboardStats.total_resources.toString(), icon: BookOpen, change: '+5%' },
    { title: 'Task Completion Rate', value: `${dashboardStats.completion_percentage}%`, icon: Award, change: '+23%' },
    { title: 'Average Streak', value: `${dashboardStats.average_streak}%`, icon: TrendingUp, change: '+8%' }
  ];

  const handleCohortCreated = (newCohortId: string) => {
    setCohortId(newCohortId);
    fetchCohorts(); // Refresh the list of cohorts
  };

  const handleDeleteWeek = async (weekNumber: number) => {
    if (!cohortId) return;
    try {
      await instructor.deleteWeekResources(cohortId, weekNumber);
      setAssignedWeeks(prev => prev.filter(week => week.week !== weekNumber));
      toast({
        title: "Resources deleted",
        description: `Week ${weekNumber} resources have been deleted.`
      });
    } catch (error) {
      if (isAxiosError(error)) {
        const axiosError = error.response?.data as ApiError;
        toast({
          variant: "destructive",
          title: "Error assigning resources",
          description: axiosError?.detail || "Please try again later."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error assigning resources",
          description: "An unexpected error occurred. Please try again later."
        });
      }

    }
  };

  const handleEditWeek = (weekNumber: number) => {
    setSelectedWeekForEdit(weekNumber);
    setIsResourceModalOpen(true);
  };

  const handleNewAssignment = () => {
    setSelectedWeekForEdit(null);
    setIsResourceModalOpen(true);
  };

  const handleResourcesAssigned = async (weekNumber: number, resources: Resource[]) => {
    if (!cohortId) return;
    setLoading(true);
    try {
      const response = await instructor.assignResourcesToWeek(
        cohortId,
        weekNumber,
        resources
      );

      setAssignedWeeks(prev => {
        const newWeekResource: WeekResource = { week: weekNumber, resources: response || [] }; // Ensure resources is an array
        const updatedWeeks = selectedWeekForEdit
          ? prev.map(week => 
            week.week === weekNumber ? newWeekResource : week
          )
          : [...prev, newWeekResource].sort((a, b) => a.week - b.week);
        return updatedWeeks;
      });

      toast({
        title: "Resources assigned",
        description: `Resources have been ${selectedWeekForEdit ? 'updated' : 'assigned'} for Week ${weekNumber}.`
      });
      setIsResourceModalOpen(false); // Close the modal
      setSelectedWeekForEdit(null); // Reset selected week
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      if (axios.isAxiosError(error)) {
      toast({
        variant: "destructive",
        title: "Error assigning resources",
        description: axiosError.response?.data?.detail || "Please try again later."
       });
    } }finally {
      setLoading(false);
    }
  };

  const memoizedExistingResources = React.useMemo(() => {
    if (selectedWeekForEdit) {
      return assignedWeeks.find(w => w.week === selectedWeekForEdit)?.resources.map(res => ({
        ...res,
        duration: res.duration || 0,
        tags: res.tags || []
      })) || [];
    }
    return [];
  }, [selectedWeekForEdit, assignedWeeks]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <>
      <CreateCohortModal
        isOpen={isCreateCohortModalOpen}
        onClose={() => setIsCreateCohortModalOpen(false)}
        onCohortCreated={handleCohortCreated}
      />

      <Dialog open={isQuizManagementOpen} onOpenChange={setIsQuizManagementOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Quiz Management</DialogTitle>
          </DialogHeader>
          <QuizManagementComponent
            quizzes={quizzes}
            currentQuiz={currentQuiz}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            handleCreateQuiz={handleCreateQuiz}
            handleEditQuiz={handleEditQuiz}
            handleDeleteQuiz={handleDeleteQuiz}
            handleSaveQuiz={handleSaveQuiz}
            cohortId={cohortId || ''}
            totalWeeks={cohorts.find(c => c.id === cohortId)?.totalWeeks || 12}
          />
        </DialogContent>
      </Dialog>

      <CohortSelection
        cohorts={cohorts}
        loading={loading}
        setCohortId={setCohortId}
        setIsCreateCohortModalOpen={setIsCreateCohortModalOpen}
        hasSelectedCohort={hasSelectedCohort}
      />

      {hasSelectedCohort && (
        <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-orange-400">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Welcome back, {userEmail}</p>
          </div>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-400/30 px-4 py-2 rounded-xl">
            Administrator
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-gray-900/50 border-orange-500/20 rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-gray-400">{stat.title}</CardTitle>
                <stat.icon className="w-5 h-5 text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400 mb-1">{stat.value}</div>
              <p className="text-xs text-cyan-400">{stat.change} from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resource Management Section */}
      <Card className="bg-gray-900/50 border-orange-500/20 mb-8 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-orange-400">Resource Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-400">Create and assign learning resources to different weeks for learners.</p>
            <button 
              onClick={handleNewAssignment}
              className="px-6 py-3 bg-orange-500/20 text-orange-400 border border-orange-400/30 rounded-xl hover:bg-orange-500/30 transition-colors font-medium"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Assign Resources
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Quiz Management Section */}
      <Card className="bg-gray-900/50 border-orange-500/20 mb-8 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-orange-400">Quiz Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-400">Create, edit, and manage quizzes for your learners.</p>
            <Button
              onClick={() => setIsQuizManagementOpen(true)}
              className="px-6 py-3 bg-orange-500/20 text-orange-400 border border-orange-400/30 rounded-xl hover:bg-orange-500/30 transition-colors font-medium"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Manage Quizzes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Weeks */}
      {assignedWeeks.length > 0 && (
        <Card className="bg-gray-900/50 border-orange-500/20 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-orange-400">Assigned Weekly Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignedWeeks.map((weekData) => (
                <div key={weekData?.week} className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-orange-300">Week {weekData?.week}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditWeek(weekData?.week)}
                        className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 rounded-xl transition-colors"
                        title="Edit Week"
                        disabled={loading}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWeek(weekData?.week)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-colors"
                        title="Delete Week"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {weekData?.resources?.map((resource) => (
                      <div key={resource.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-xl border border-gray-600/30">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            resource.type === 'VIDEO' ? 'bg-red-500' :
                            resource.type === 'ARTICLE' ? 'bg-blue-500' : 'bg-green-500'
                          }`} />
                          <div>
                            <p className="text-orange-300 font-medium">{resource.title}</p>
                            <p className="text-sm text-gray-400">{resource.type} • {resource.url}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Resource Modal */}
      <AdminResourceModal 
        isOpen={isResourceModalOpen}
        onClose={() => {
          setIsResourceModalOpen(false);
          setSelectedWeekForEdit(null);
        }}
        editingWeek={selectedWeekForEdit}
        existingResources={memoizedExistingResources}
          onResourcesAssigned={(week, resources) => handleResourcesAssigned(week, resources as Resource[])}
        cohortId={cohortId}
        totalWeeks={cohorts.find(c => c.id === cohortId)?.totalWeeks || 12} // Pass totalWeeks of selected cohort
      />
    </div>
  )}
  </>)
};












export default AdminDashboard;
