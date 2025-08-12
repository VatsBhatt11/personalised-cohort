
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { learner, TaskInPlan, Plan, WeekResource, Resource, WeeklyProgressResponse } from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { QuizAttemptComponent } from './QuizAttemptComponent';
import { QuizFeedbackComponent } from './QuizFeedbackComponent';

type WeeklyPlanData = Plan;

interface GoalSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWeek: number | null;
  cohortId: string | null;
  weeklyPlan: WeeklyPlanData | null;
  setWeeklyPlan: React.Dispatch<React.SetStateAction<WeeklyPlanData | null>>;
  allResources: WeekResource[];
  setWeeklyProgress: React.Dispatch<React.SetStateAction<WeeklyProgressResponse | null>>;
}

interface QuizAttemptStatus {
  hasAttempted: boolean;
  lastAttemptId?: string;
}

const GoalSettingModal: React.FC<GoalSettingModalProps> = ({
  isOpen,
  onClose,
  selectedWeek,
  cohortId,
  weeklyPlan,
  setWeeklyPlan,
  allResources,
}) => {
  const { toast } = useToast();
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [resourceStartTime, setResourceStartTime] = useState<number | null>(null);
  const [timeSpentOnResource, setTimeSpentOnResource] = useState<number>(0);
  const [selectedTask, setSelectedTask] = useState<TaskInPlan | null>(null);
  const [quizResource, setQuizResource] = useState<Resource | null>(null);
  const [quizAttemptStatus, setQuizAttemptStatus] = useState<QuizAttemptStatus | null>(null);
  const [isQuizAttemptOpen, setIsQuizAttemptOpen] = useState(false);
  const [isQuizFeedbackOpen, setIsQuizFeedbackOpen] = useState(false);
  const [lastAttemptId, setLastAttemptId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedWeek !== null && allResources.length > 0) {
      const weekResources = allResources.find(wr => wr.week === selectedWeek);
      if (weekResources) {
        const quiz = weekResources.resources.find(r => r.type === 'QUIZ');
        setQuizResource(quiz || null);
        if (quiz) {
          const checkQuizAttemptStatus = async () => {
            try {
              const response = await learner.getQuizAttemptStatus(quiz.id);
              setQuizAttemptStatus(response);
              if (response.lastAttemptId) {
                setLastAttemptId(response.lastAttemptId);
              }
            } catch (error) {
              console.error("Error fetching quiz attempt status:", error);
              setQuizAttemptStatus({ hasAttempted: false });
            }
          };
          checkQuizAttemptStatus();
        }
      }
    }
  }, [selectedWeek, allResources]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (resourceModalOpen && selectedTask) {
      // Initialize timeSpentOnResource from the task's current time_spent_seconds
      // Assuming task.time_spent_seconds exists and is passed from backend
      // If not, it will default to 0
      setTimeSpentOnResource(selectedTask.time_spent_seconds || 0);
      // When opening the resource, set resourceStartTime to current time
      setResourceStartTime(Date.now());


      // Initialize timeSpentOnResource from the task's current time_spent_seconds
      // Assuming task.time_spent_seconds exists and is passed from backend
      // If not, it will default to 0
      setTimeSpentOnResource(selectedTask.time_spent_seconds || 0);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [resourceModalOpen, selectedTask]); // Depend on modal open state and selected task

  const handleResourceModalClose = useCallback(async () => {
    setResourceModalOpen(false);
    if (resourceStartTime && selectedTask) {
      const newTimeSpent = timeSpentOnResource + (Date.now() - resourceStartTime) / 1000;
      try {
        await learner.trackResourceTime(selectedTask.id, Math.ceil(newTimeSpent));
        const timeToAccess = ((selectedTask.resource?.duration) * 60) || 0;

        if (newTimeSpent >= timeToAccess) {
          await learner.completeTask(selectedTask.id);
          toast({
            title: 'Task Completed',
            description: `Task marked as complete successfully. You spent ${newTimeSpent.toFixed(2)} seconds on this resource.`, 
          });
          setWeeklyPlan((prevPlan) => {
            if (!prevPlan) return null;
            const updatedTasks = prevPlan.tasks.map((task) =>
              task.id === selectedTask.id ? { ...task, is_completed: true } : task
            );
            return { ...prevPlan, tasks: updatedTasks };
          });
        } else {
          toast({
            title: 'Resource Access',
            description: `You need to spend at least ${timeToAccess} seconds on this resource to mark it as complete. You spent ${newTimeSpent.toFixed(2)} seconds.`, 
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Failed to track resource time or mark task as complete:', error);
        toast({
          title: 'Error',
          description: 'Failed to update resource time or mark task as complete.',
          variant: 'destructive',
        });
      }
    }
    setResourceStartTime(null);
    setTimeSpentOnResource(0);
  }, [resourceStartTime, selectedTask, setWeeklyPlan, toast, timeSpentOnResource]);

  const handleAttemptComplete = useCallback((attemptId: string) => {
    setLastAttemptId(attemptId);
    setIsQuizAttemptOpen(false);
    setIsQuizFeedbackOpen(true);
  }, []);

  const handleQuizButtonClick = useCallback(() => {
    if (lastAttemptId) {
      setLastAttemptId(lastAttemptId);
      setIsQuizFeedbackOpen(true);
    } else {
      setIsQuizAttemptOpen(true);
    }
  }, [quizAttemptStatus]);

  const handleClose = useCallback(() => {
    setIsQuizAttemptOpen(false);
    setIsQuizFeedbackOpen(false);
    setLastAttemptId(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border border-orange-500/20 max-w-3xl w-[95%] sm:max-w-3xl rounded-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-orange-500">
            Level {selectedWeek} - Weekly Plan
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
            {weeklyPlan?.tasks && weeklyPlan.tasks.length > 0 ? (
              <div className="space-y-4">
                {weeklyPlan.tasks.map((task) => (
                  <Card key={task.id} className="bg-gray-900 border border-orange-500/10 rounded-xl shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${{ 'Video': 'bg-red-500', 'Reading': 'bg-blue-500', 'Exercise': 'bg-green-500' }[task.resource.type] || 'bg-gray-500'}`} />
                          <div>
                            <p className="text-orange-300 font-medium">{task.resource.title}</p>
                            <p className="text-sm text-gray-400">{task.resource.type} • {task.resource.duration} min</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.status==="COMPLETED" && (
                            <Badge variant="secondary" className="bg-green-500 text-white">Completed</Badge>
                          )}
                          <Button
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                            onClick={() => {
                              setSelectedTask(task);
                              setResourceModalOpen(true);
                            }}
                            disabled={task.is_completed} // Disable button if task is completed
                          >
                            {task.is_completed ? 'View Resource' : 'Open Resource'}
                          </Button>

                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {quizResource && (
                  <Card className="bg-gray-900 border border-orange-500/10 rounded-xl shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-orange-300">Weekly Quiz</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-orange-300 font-medium">{quizResource.title}</p>
                          <p className="text-sm text-gray-400">Test your knowledge for this week.</p>
                        </div>
                        <Button onClick={handleQuizButtonClick} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200">
                          {lastAttemptId ? 'View Feedback' : 'Take Quiz'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {resourceModalOpen && selectedTask && (
                  <Modal
                    title={selectedTask.resource.title}
                    description="Interact with the resource below."
                    isOpen={resourceModalOpen}
                    onClose={handleResourceModalClose}
                  >
                    <div className="relative bg-gray-800 h-[70vh] w-full">
                      <iframe
                        src={selectedTask.resource.url}
                        title={selectedTask.resource.title}
                        className="w-full h-full border-0"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button onClick={handleResourceModalClose} className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200">Close</Button>
                    </DialogFooter>
                  </Modal>
                )}

                {quizResource && isQuizAttemptOpen && (
                  <Dialog open={isQuizAttemptOpen} onOpenChange={setIsQuizAttemptOpen}>
                    <DialogContent className="bg-gray-800 border border-orange-500/20 max-w-3xl w-[95%] sm:max-w-3xl rounded-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-2xl text-orange-500">
                          Weekly Quiz Attempt
                        </DialogTitle>
                      </DialogHeader>
                      <QuizAttemptComponent
                        quizId={quizResource.id}
                        onAttemptComplete={handleAttemptComplete}
                        onClose={() => setIsQuizAttemptOpen(false)}
                      />
                    </DialogContent>
                  </Dialog>
                )}

                {quizResource && isQuizFeedbackOpen && lastAttemptId && (
                  <Dialog open={isQuizFeedbackOpen} onOpenChange={setIsQuizFeedbackOpen}>
                    <DialogContent className="bg-gray-800 border border-orange-500/20 max-w-3xl w-[95%] sm:max-w-3xl rounded-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-2xl text-orange-500">
                          Weekly Quiz Feedback
                        </DialogTitle>
                      </DialogHeader>
                      <QuizFeedbackComponent
                        attemptId={lastAttemptId}
                        onClose={() => {
                          setIsQuizFeedbackOpen(false);
                          setLastAttemptId(null);
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            ) : (
               <div className="text-center text-gray-400">
                 No plan set for this week.
               </div>
             )}
           </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalSettingModal;
