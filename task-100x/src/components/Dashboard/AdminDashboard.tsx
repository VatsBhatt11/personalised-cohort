
import React, { useState, useEffect, useCallback } from 'react';
import logo from '../../../public/100x.svg'
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Award, TrendingUp, Edit, Trash2, Loader2, HelpCircle, Send } from 'lucide-react';
import QuizForm from './QuizForm';
import QuizCard from './QuizCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import AdminResourceModal from './AdminResourceModal';
import SessionManagementModal from './SessionManagementModal';
import CreateCohortModal from './CreateCohortModal';
import QuizManagementComponent, { Quiz } from './QuizManagementComponent';
import { CohortSelection } from './CohortSelection';
import { useToast } from '@/components/ui/use-toast';
import useAuth from '@/hooks/useAuth';
import { LogOut } from 'lucide-react';
import { instructor, learner, WeekResource } from '@/lib/api';
import axios, { isAxiosError, type AxiosError } from 'axios';
import { Link, useLocation } from 'react-router-dom';
import BuildInPublicUserTable from '../BuildInPublic/BuildInPublicUserTable';

interface Resource {
  id?: string;
  title: string;
  type: 'VIDEO' | 'ARTICLE' | 'DOCUMENT';
  url: string;
  duration: number;
  tags: string[];
  isOptional?: boolean;
}

interface Session {
  id: string;
  title: string;
  description: string;
  weekNumber: number;
  cohortId: string;
  sessionType?: string;
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

const AdminDashboard: React.FC = ({ userEmail }: AdminDashboardProps) => {
  const location = useLocation();
  const isBuildInPublicRoute = location.pathname === '/admin/track-100x';
  const gilroyFont = 'Gilroy, sans-serif';
  const jetbrainsMonoFont = 'Jetbrains Mono, monospace';
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isQuizManagementOpen, setIsQuizManagementOpen] = useState(false);
  const [selectedWeekForEdit, setSelectedWeekForEdit] = useState<number | null>(null);
  const [assignedWeeks, setAssignedWeeks] = useState<WeekResource[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    total_learners: 0,
    total_resources: 0,
    completion_percentage: 0,
    average_streak: 0,
  });
  const [loading, setLoading] = useState(false);
  const [cohortId, setCohortIdState] = useState<string | null>(null);

  const setCohortId = (id: string | null) => {
    setCohortIdState(id);
    if (id) {
      document.cookie = `cohortId=${id}; path=/; max-age=${60 * 60 * 24 * 30}`;
    } else {
      document.cookie = `cohortId=; path=/; max-age=0`;
    }
  };
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [hasSelectedCohort, setHasSelectedCohort] = useState<boolean>(false);
  const [isCreateCohortModalOpen, setIsCreateCohortModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [isGenerateAIModalOpen, setIsGenerateAIModalOpen] = useState(false);
  const { toast } = useToast();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

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

  const fetchSessions = useCallback(async (selectedCohortId: string | null) => {
    if (!selectedCohortId) return;
    try {
      const response = await instructor.getSessions(selectedCohortId);
      setSessions(response);
    } catch (error) {
      if (isAxiosError(error)) {
        toast({
          variant: "destructive",
          title: "Error fetching sessions",
          description: error.response?.data?.detail || "Please try again later.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error fetching sessions",
          description: "An unexpected error occurred. Please try again later.",
        });
      }
    }
  }, [toast]);

  useEffect(() => {
    if (cohortId) {
      fetchQuizzes(cohortId);
      fetchSessions(cohortId);
    }
  }, [fetchQuizzes, fetchSessions, cohortId]);

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

  const handleGenerateQuizFromAI = (quiz: Quiz) => {
    setCurrentQuiz(quiz);
    setIsModalOpen(true);
    setIsGenerateAIModalOpen(false);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) {
      return;
    }
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuiz = async (quizData: Quiz) => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotifications = async (sessionId: string) => {
    if (!cohortId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a cohort before sending notifications.",
      });
      return;
    }
    try {
      await instructor.sendNotifications(sessionId);
      toast({
        title: "Success",
        description: "Notifications sent successfully.",
      });
    } catch (error) {
      console.error("Failed to send notifications:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.detail || "An error occurred while sending notifications.",
      });
    }
  };

  const handleCreateSession = () => {
    if (!cohortId) {
      toast({
        variant: "destructive",
        title: "No Cohort Selected",
        description: "Please select a cohort before creating a session.",
      });
      return;
    }
    setIsSessionModalOpen(true);
  };



  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to delete this session?")) {
      return;
    }
    setLoading(true);
    try {
      await instructor.deleteSession(sessionId);
      toast({
        title: "Session deleted",
        description: "The session has been successfully deleted.",
      });
      fetchSessions(cohortId);
    } catch (error) {
      if (isAxiosError(error)) {
        toast({
          variant: "destructive",
          title: "Error deleting session",
          description: error.response?.data?.detail || "Please try again later.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error deleting session",
          description: "An unexpected error occurred. Please try again later.",
        });
      }
    } finally {
      setLoading(false);
    }
  };




 const fetchResources = async () => {
       setLoading(true);
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
       } finally {
         setLoading(false);
       }
     };

   // Existing useEffect for fetching dashboard data and resources
   useEffect(() => {
     if (!cohortId) return;

     const fetchDashboardData = async () => {
       setLoading(true);
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

       } finally {
         setLoading(false);
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
    setLoading(true);
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

    } finally {
      setLoading(false);
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
      <div className="flex justify-center items-center h-screen bg-white" style={{ fontFamily: gilroyFont }}>
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
        <DialogContent className="sm:max-w-[800px] bg-orange-100 text-black" style={{ fontFamily: jetbrainsMonoFont }}>
          <DialogHeader>
            <DialogTitle className="text-black">Quiz Management</DialogTitle>
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
            handleGenerateQuizFromAI={handleGenerateQuizFromAI}
            isGenerateAIModalOpen={isGenerateAIModalOpen}
            setIsGenerateAIModalOpen={setIsGenerateAIModalOpen}
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

       <SessionManagementModal
         isOpen={isSessionModalOpen}
         onClose={() => {
           setIsSessionModalOpen(false);
           setEditingSession(null); // Clear editing session when modal closes
         }}
         cohortId={cohortId || ''}
         onSessionCreated={() => fetchSessions(cohortId)}
         totalWeeks={cohorts.find(c => c.id === cohortId)?.totalWeeks || 12}
         editingSession={editingSession}
       />


      {hasSelectedCohort && (
        <div className="min-h-screen bg-white p-6 font-sans" style={{ fontFamily: gilroyFont }}>
      {isBuildInPublicRoute && cohortId ? (
            <BuildInPublicUserTable cohortId={cohortId} />
          ) : (
            <>
                  {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center bg-orange-400 rounded-xl p-4">
            <img src={logo} alt="100xEngineers Logo" className="h-12 mr-4" />
          </div>
          <div className="flex items-center space-x-4">
            <Badge className="bg-orange-500 text-black border-orange-700 px-5 py-2 rounded-full text-base font-medium shadow-lg">
              Administrator
            </Badge>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-black hover:text-gray-800 transition-colors duration-200"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </div>


      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-orange-100 border border-orange-200 rounded-xl shadow-lg hover:shadow-orange-300/20 transition-all duration-300 ease-in-out">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-black">{stat.title}</CardTitle>
                <stat.icon className="w-6 h-6 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 mb-1">{stat.value}</div>
              <p className="text-xs text-gray-700">{stat.change} from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resource and Quiz Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <Card className="bg-orange-100 border border-orange-200 rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-orange-700">Resource Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <p className="text-black text-lg">Create and assign learning resources to different weeks for learners.</p>
              <Button 
                onClick={handleNewAssignment}
                className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-3" /> : null} Assign Resources
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-100 border border-orange-200 rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-orange-700">Quiz Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <p className="text-black text-lg">Create, edit, and manage quizzes for your learners.</p>
              <Link to="/admin/track-100x">
                <Button
                  className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                >
                  <HelpCircle className="mr-3 h-5 w-5" />
                  Manage Quizzes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-100 border border-orange-200 rounded-xl shadow-lg mb-10">
           <div className='flex justify-between items-center'>
           <CardHeader>
             <CardTitle className="text-2xl font-bold text-orange-700">Session Management</CardTitle>
           </CardHeader>
           <Button
                 onClick={handleCreateSession}
                 className="mx-5 px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
               >
                 Create New Session
               </Button>
          </div>
           <CardContent>
             <div className="space-y-6">
               {sessions.length > 0 ? (
                 <div className="space-y-4">
                   {sessions.map((session) => (
                     <div key={session.id} className="bg-orange-200 border border-orange-300 rounded-lg p-5 shadow-md">
                       <div className="flex items-center justify-between mb-2">
                         <h4 className="text-xl font-semibold text-orange-800">{session.title} (Week {session.weekNumber})</h4>
                         <div className="flex gap-3">
                           <Button
                             onClick={() => {
                               setEditingSession(session);
                               setIsSessionModalOpen(true);
                             }}
                             className="p-2 text-orange-700 hover:text-orange-900 hover:bg-orange-300 rounded-md transition-colors duration-200"
                             title="Edit Session"
                             disabled={loading}
                           >
                             <Edit className="w-5 h-5" />
                           </Button>
                           <Button
                             onClick={() => handleDeleteSession(session.id)}
                             className="p-2 text-red-600 hover:text-red-800 hover:bg-orange-300 rounded-md transition-colors duration-200"
                             title="Delete Session"
                             disabled={loading}
                           >
                             <Trash2 className="w-5 h-5" />
                           </Button>
                           <Button
                             onClick={() => handleSendNotifications(session.id)}
                             className="p-2 text-green-600 hover:text-green-800 hover:bg-orange-300 rounded-md transition-colors duration-200"
                             title="Send Notifications"
                             disabled={loading}
                           >
                             <Send className="w-5 h-5" />
                           </Button>
                         </div>
                       </div>
                       <p className="text-black">{session.description}</p>
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-black">No sessions created yet.</p>
               )}
             </div>
           </CardContent>
         </Card>

         <Card className="bg-orange-100 border border-orange-200 rounded-xl shadow-lg">
           <CardHeader>
             <CardTitle className="text-2xl font-bold text-orange-700">Build In Public Management</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-5">
               <p className="text-black text-lg">Track and manage user activity for the Build in Public initiative.</p>
               <Link to="/admin/track-100x">
                 <Button
                   className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                 >
                   <TrendingUp className="mr-3 h-5 w-5" />
                   Track 100x
                 </Button>
               </Link>
             </div>
           </CardContent>
         </Card>
      </div>

      {assignedWeeks.length > 0 && (
        <Card className="bg-orange-100 border border-orange-200 rounded-xl shadow-lg mb-10">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-orange-700">Assigned Weekly Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {assignedWeeks.map((weekData) => (
                <div key={weekData?.week} className="bg-orange-200 border border-orange-300 rounded-lg p-5 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-semibold text-orange-800">Week {weekData?.week}</h4>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleEditWeek(weekData?.week)}
                        className="p-2 text-orange-700 hover:text-orange-900 hover:bg-orange-300 rounded-md transition-colors duration-200"
                        title="Edit Week"
                        disabled={loading}
                      >
                        <Edit className="w-5 h-5" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteWeek(weekData?.week)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-orange-300 rounded-md transition-colors duration-200"
                        title="Delete Week"
                        disabled={loading}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {weekData?.resources?.map((resource) => (
                      <div key={resource.id} className="flex items-center justify-between p-4 bg-orange-300/50 rounded-md border border-orange-400/50">
                        <div className="flex items-center gap-4">
                          <div className={`w-4 h-4 rounded-full ${
                            resource.type === 'VIDEO' ? 'bg-red-500' :
                            resource.type === 'ARTICLE' ? 'bg-blue-500' : 'bg-green-500'
                          }`} />
                          <div>
                            <p className="text-orange-800 font-medium text-lg">{resource.title}</p>
                            <p className="text-sm text-black">{resource.type} • {resource.url}</p>
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
        fontFamily={jetbrainsMonoFont}
      />
    </>
  )}
  </div>)}
  </>)
};

export default AdminDashboard;
