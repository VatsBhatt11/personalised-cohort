
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { learner, TaskInPlan, Plan } from '@/lib/api';

interface GoalSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  showGoalForm: boolean;
  selectedWeek: number | null;
  onGoalsSet: () => void;
}

interface Resource {
  id: string;
  type: string;
  title: string;
  duration: number;
  selectedDay?: string;
}

interface WeeklyPlanData extends Plan {}

const GoalSettingModal = ({ isOpen, onClose, showGoalForm, selectedWeek, onGoalsSet }: GoalSettingModalProps) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanData | null>(null);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const { toast } = useToast();

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    const fetchCohortId = async () => {
      try {
        const currentCohort = await learner.getCurrentCohort();
        setCohortId(currentCohort.id);
      } catch (error) {
        console.error("Error fetching cohort ID:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch cohort information."
        });
      }
    };

    fetchCohortId();
  }, []);

  useEffect(() => {
    if (!cohortId || selectedWeek === null) return; // Add selectedWeek to dependency check

    const fetchResources = async () => {
      try {
        const response = await learner.getAllResources(cohortId);
        const weekResources = response.find(weekData => weekData.week === selectedWeek); // Use selectedWeek directly
        const filteredResources: Resource[] = [];
        if (weekResources) {
          weekResources.resources.forEach(resource => {
            filteredResources.push({
              id: String(resource.id),
              type: resource.type,
              title: resource.title,
              duration: resource.duration,
              selectedDay: undefined
            });
          });
        }
        setResources(filteredResources);
      } catch (error) {
        console.error(error)
        toast({
          variant: "destructive",
          title: "Error fetching resources",
          description: "Please try again later."
        });
      }
    };

    const fetchPlan = async () => {
      try {
        const allPlans = await learner.getPlan(cohortId);
        console.log("All plans:", allPlans);

        const weeklyPlanForSelectedWeek = allPlans.find(plan => 
          plan.tasks.some(task => task.resource.weekNumber === selectedWeek)
        );

        if (weeklyPlanForSelectedWeek) {
          const filteredTasks = weeklyPlanForSelectedWeek.tasks.filter(task => task.resource.weekNumber === selectedWeek);
          const planWithDays: WeeklyPlanData = {
            ...weeklyPlanForSelectedWeek,
            tasks: filteredTasks.map(task => ({
              ...task,
              day: days[task.dayIndex],
              resource: task.resource
            }))
          };
          console.log("Plan for selected week:", planWithDays);
          setWeeklyPlan(planWithDays);
        } else {
          setWeeklyPlan(null);
        }
      } catch (error) {
        console.error(error)
        toast({
          variant: "destructive",
          title: "Error fetching plan",
          description: "Please try again later."
        });
      }
    };

    if (showGoalForm) {
      fetchResources();
    } else {
      fetchPlan();
    }
  }, [showGoalForm, cohortId, selectedWeek]);

  const assignDay = (resourceId: string, day: string) => {
    setResources(prev => prev.map(resource => 
      resource.id === resourceId ? { ...resource, selectedDay: day } : resource
    ));
  };

  const handleMarkAsComplete = async (taskId: string) => {
    try {
      await learner.completeTask(taskId);
      toast({
        title: "Task Completed",
        description: "Great job! Task marked as complete."
      });
      // Refresh the plan to show updated status
      if (cohortId) {
        const allPlans = await learner.getPlan(cohortId);
        const weeklyPlanForSelectedWeek = allPlans.find(plan => 
          plan.tasks.some(task => task.resource.weekNumber === selectedWeek)
        );
        if (weeklyPlanForSelectedWeek) {
          const planWithDays: WeeklyPlanData = {
            ...weeklyPlanForSelectedWeek,
            tasks: weeklyPlanForSelectedWeek.tasks.map(task => ({
              ...task,
              day: days[task.dayIndex],
              resource: task.resource
            }))
          };
          setWeeklyPlan(planWithDays);
        }
      }
    } catch (error) {
      console.error("Error marking task complete:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark task as complete."
      });
    }
  };

  const handleCreatePlan = async () => {
    const assignedResources = resources.filter(r => r.selectedDay);
    if (assignedResources.length === 0) return;
    
    setLoading(true);
    try {
      await learner.createPlan(cohortId!, assignedResources.map(resource => ({
        resourceId: resource.id,
        dayIndex: days.indexOf(resource.selectedDay!)
      })));
      
      toast({
        title: "Plan created successfully",
        description: "Your weekly learning plan has been set."
      });
      
      onGoalsSet();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error creating plan",
        description: "Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-orange-500/20 max-w-3xl w-[95%] sm:max-w-3xl rounded-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-orange-500">
            {showGoalForm ? `Level ${selectedWeek} - Assign Resources` : `Level ${selectedWeek} - Weekly Plan`}
          </DialogTitle>
        </DialogHeader>
        
        {showGoalForm ? (
          <div className="space-y-6">
            <div className="text-orange-400 mb-4">
              Assign the following resources to days of the week:
            </div>
            
            <div className="space-y-4">
              {resources.map((resource) => (
                <Card key={resource.id} className="bg-gray-900/50 border-orange-500/10 rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${{
                          'Video': 'bg-red-500',
                          'Reading': 'bg-blue-500',
                          'Exercise': 'bg-green-500'
                        }[resource.type] || 'bg-gray-500'}`} />
                        <div>
                          <p className="text-orange-300 font-medium">{resource.title}</p>
                          <p className="text-sm text-gray-400">{resource.type} • {resource.duration} min</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {resource.selectedDay ? (
                          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-400/30 rounded-full">
                            {resource.selectedDay}
                          </Badge>
                        ) : (
                          <div className="flex gap-1">
                            {days.map(day => (
                              <button
                                key={day}
                                onClick={() => assignDay(resource.id, day)}
                                className="px-2 py-1 text-xs rounded border border-orange-500/30 text-orange-500/70 hover:bg-orange-500/10 hover:text-orange-500 transition-colors"
                              >
                                {day.slice(0, 3)}
                              </button>
                            ))}
                          </div>
                        )}
                        {resource.selectedDay && (
                          <button
                            onClick={() => assignDay(resource.id, '')}
                            className="ml-2 text-xs text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4">
              <div className="text-orange-400">
                <span className="font-semibold">
                  {resources.filter(r => r.selectedDay).length} of {resources.length} resources assigned
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-600 text-gray-400 hover:bg-gray-800 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePlan}
                  className="bg-orange-500 hover:bg-cyan-500 text-black font-medium rounded-xl transition-colors"
                  disabled={resources.filter(r => r.selectedDay).length === 0 || loading}
                >
                  {loading ? 'Creating...' : 'Create Plan'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {weeklyPlan?.tasks && weeklyPlan.tasks.length > 0 && !showGoalForm ? (
              <div className="space-y-4">
                {weeklyPlan.tasks.map((task) => (
                  <Card key={task.id} className="bg-gray-900/50 border-orange-500/10 rounded-xl">
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
                          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-400/30 rounded-full">
                            {task.day}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(task.resource.url, '_blank')}
                            className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                          >
                            Access Resource
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsComplete(task.id)}
                            disabled={task.status === 'COMPLETED'}
                            className="text-green-500 border-green-500/30 hover:bg-green-500/10"
                          >
                            {task.status === 'COMPLETED' ? 'Completed' : 'Mark as Done'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
               <div className="text-center text-gray-400">
                 No plan set for this week. Please create one.
               </div>
             )}
           </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GoalSettingModal;
