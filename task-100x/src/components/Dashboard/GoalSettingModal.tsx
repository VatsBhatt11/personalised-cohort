
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { learner, TaskInPlan, Plan } from '@/lib/api';
import { Modal } from '@/components/ui/modal';

type WeeklyPlanData = Plan;

interface GoalSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWeek: number | null;
  cohortId: string | null;
  weeklyPlan: WeeklyPlanData | null;
  setWeeklyPlan: React.Dispatch<React.SetStateAction<WeeklyPlanData | null>>;
}

const GoalSettingModal: React.FC<GoalSettingModalProps> = ({
  isOpen,
  onClose,
  selectedWeek,
  cohortId,
  weeklyPlan,
  setWeeklyPlan,
}) => {
  const { toast } = useToast();
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [resourceStartTime, setResourceStartTime] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskInPlan | null>(null);

  const handleResourceModalClose = async () => {
    setResourceModalOpen(false);
    if (resourceStartTime && selectedTask) {
      const duration = Date.now() - resourceStartTime;
      const timeToAccess = ((selectedTask.resource?.duration)*60) || 0; // Assuming timeToAccess is in seconds

      if (duration / 1000 >= timeToAccess) {
        try {
          await learner.completeTask(selectedTask.id);
          toast({
            title: 'Task Completed',
            description: 'Task marked as complete successfully.',
          });
          if (cohortId && selectedWeek !== null) {
            const updatedPlan = await learner.getPlan(cohortId, selectedWeek);
            if (updatedPlan) {
              setWeeklyPlan(updatedPlan);
            }
          }
        } catch (error) {
          console.error('Failed to mark task as complete:', error);
          toast({
            title: 'Error',
            description: 'Failed to mark task as complete.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Resource Access',
          description: `You need to spend at least ${timeToAccess} seconds on this resource to mark it as complete. You spent ${(duration / 1000).toFixed(2)} seconds.`, 
          variant: 'destructive',
        });
      }
    }
    setResourceStartTime(null);
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass border-orange-500/20 max-w-3xl w-[95%] sm:max-w-3xl rounded-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-orange-500">
            Level {selectedWeek} - Weekly Plan
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
            {weeklyPlan?.tasks && weeklyPlan.tasks.length > 0 ? (
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

                          <Button
                            className="w-full"
                            onClick={() => {
                              setSelectedTask(task);
                              setResourceModalOpen(true);
                              setResourceStartTime(Date.now());
                            }}
                          >
                            Open Resource
                          </Button>

                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {resourceModalOpen && selectedTask && (
                  <Modal
                    title={selectedTask.resource.title}
                    description="Interact with the resource below."
                    isOpen={resourceModalOpen}
                    onClose={handleResourceModalClose}
                  >
                    <div className="relative h-[70vh] w-full">
                      <iframe
                        src={selectedTask.resource.url}
                        title={selectedTask.resource.title}
                        className="w-full h-full border-0"
                        allowFullScreen
                      ></iframe>
                    </div>
                    <DialogFooter className="mt-4">
                      <Button onClick={handleResourceModalClose}>Close</Button>
                    </DialogFooter>
                  </Modal>
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
