import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import QuizForm from './QuizForm';
import QuizCard from './QuizCard';

import { Quiz, Option, Question } from '../../lib/api';
import { DialogClose } from '@radix-ui/react-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';
import { instructor } from '../../lib/api';

interface GenerateQuizAIModalProps {
  cohortId: string;
  totalWeeks: number;
  onQuizGenerated: (quiz: Quiz) => void;
  onClose: () => void;
}

const GenerateQuizAIModal: React.FC<GenerateQuizAIModalProps> = ({
  cohortId,
  totalWeeks,
  onQuizGenerated,
  onClose,
}) => {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [transcription, setTranscription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!transcription.trim()) {
      toast.error('Please provide a session transcription.');
      return;
    }
    setIsLoading(true);
    try {
      const generatedQuiz = await instructor.generateQuizFromAI(cohortId, weekNumber, transcription);
      onQuizGenerated(generatedQuiz);
      toast.success('Quiz generated successfully using AI!');
      onClose();
    } catch (error) {
      console.error('Error generating quiz from AI:', error);
      toast.error('Failed to generate quiz from AI. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="ai-week-select" className="text-right">Week Number</Label>
        <Select
          onValueChange={(value) => setWeekNumber(Number(value))}
          value={String(weekNumber)}
        >
          <SelectTrigger id="ai-week-select" className="col-span-3">
            <SelectValue placeholder="Select a week" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
              <SelectItem key={week} value={String(week)}>
                Week {week}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="transcription" className="text-right">Session Transcription</Label>
        <Textarea
          id="transcription"
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
          placeholder="Paste session transcription here..."
          className="col-span-3 h-32"
        />
      </div>
      <div className="flex justify-end gap-2">
        <DialogClose asChild>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </DialogClose>
        <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate Quiz'}
        </Button>
      </div>
    </div>
  );
};




interface QuizManagementComponentProps {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  handleCreateQuiz: () => void;
  handleEditQuiz: (quiz: Quiz) => void;
  handleDeleteQuiz: (quizId: string) => void;
  handleSaveQuiz: (quizData: Quiz) => void;
  cohortId: string | null;
  totalWeeks: number;
  handleGenerateQuizFromAI: (quiz: Quiz) => void;
  isGenerateAIModalOpen: boolean;
  setIsGenerateAIModalOpen: (isOpen: boolean) => void;

}

const QuizManagementComponent: React.FC<QuizManagementComponentProps> = ({
  quizzes,
  currentQuiz,
  isModalOpen,
  setIsModalOpen,
  handleCreateQuiz,
  handleEditQuiz,
  handleDeleteQuiz,
  handleSaveQuiz,
  cohortId,
  totalWeeks,
  handleGenerateQuizFromAI,
  isGenerateAIModalOpen,
  setIsGenerateAIModalOpen,
}) => {

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateQuiz}>Create New Quiz</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>{currentQuiz ? 'Edit Quiz' : 'Create New Quiz'}</DialogTitle>
              </DialogHeader>
              {cohortId && <QuizForm initialData={currentQuiz} onSave={handleSaveQuiz} cohortId={cohortId} totalWeeks={totalWeeks} />}
            </DialogContent>
          </Dialog>

          <Dialog open={isGenerateAIModalOpen} onOpenChange={setIsGenerateAIModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Create Quiz using AI</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>Generate Quiz with AI</DialogTitle>
              </DialogHeader>
              {cohortId && (
                <GenerateQuizAIModal
                  cohortId={cohortId}
                  totalWeeks={totalWeeks}
                  onQuizGenerated={handleGenerateQuizFromAI}
                  onClose={() => setIsGenerateAIModalOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {quizzes?.filter(quiz => quiz.id).map((quiz) => (
          <QuizCard key={quiz.id} quiz={quiz} onEdit={handleEditQuiz} onDelete={handleDeleteQuiz} />
        ))}
      </div>
    </div>
  );
};

export default QuizManagementComponent;
export type { QuizManagementComponentProps };