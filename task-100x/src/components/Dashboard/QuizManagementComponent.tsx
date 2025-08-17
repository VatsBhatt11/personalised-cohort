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
  onClose
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
    <div className="grid gap-6 py-6">
      <div className="space-y-2">
        <Label htmlFor="ai-week-select" className="text-orange-400 font-medium">Week Number</Label>
        <Select
          onValueChange={(value) => setWeekNumber(Number(value))}
          value={String(weekNumber)}
        >
          <SelectTrigger id="ai-week-select" className="w-full p-3 border border-orange-600/30 rounded-xl bg-orange-50 text-black focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 ease-in-out shadow-lg hover:border-orange-400">
            <SelectValue placeholder="Select a week" />
          </SelectTrigger>
          <SelectContent className="bg-orange-50 text-black border border-orange-600/30 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
              <SelectItem key={week} value={String(week)} className="hover:bg-orange-600/20 focus:bg-orange-600/20 cursor-pointer py-2 px-4 transition-colors duration-200 ease-in-out text-black">
                Week {week}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="transcription" className="text-orange-400 font-medium">Session Transcription</Label>
        <Textarea
            id="transcription"
            value={transcription}
            onChange={(e) => setTranscription(e.target.value)}
            placeholder="Paste session transcription here..."
            className="w-full bg-orange-50 border border-orange-600/50 text-black px-4 py-2 rounded-xl focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition-all duration-200 ease-in-out placeholder:text-gray-500 h-32"
        />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="outline" onClick={onClose} className="border-orange-600/50 text-black hover:bg-orange-600/20 rounded-xl shadow-md transition-all duration-200 ease-in-out">
          Cancel
        </Button>
        <Button type="submit" onClick={handleSubmit} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-md transition-all duration-200 ease-in-out">
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
  isLoading: boolean;
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
  isLoading
}) => {
  return (
    <div className="p-6 bg-white rounded-2xl shadow-xl border border-orange-600/30">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-orange-300">Quiz Management</h2>
        <div className="flex gap-3">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateQuiz} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-md transition-all duration-200 ease-in-out">
                Create New Quiz
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] glass border-orange-600/20 rounded-2xl bg-orange-100" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-orange-400">{currentQuiz ? 'Edit Quiz' : 'Create New Quiz'}</DialogTitle>
              </DialogHeader>
              {cohortId && <QuizForm initialData={currentQuiz} onSave={handleSaveQuiz} cohortId={cohortId} totalWeeks={totalWeeks} isLoading={isLoading} />}
            </DialogContent>
          </Dialog>

          <Dialog open={isGenerateAIModalOpen} onOpenChange={setIsGenerateAIModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-orange-600/50 text-orange-400 hover:bg-orange-600/20 rounded-xl shadow-md transition-all duration-200 ease-in-out">
                Create Quiz using AI
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] glass border-orange-600/20 rounded-2xl bg-orange-100" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-orange-400">Generate Quiz with AI</DialogTitle>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
        {quizzes?.filter(quiz => quiz.id).map((quiz) => (
          <QuizCard key={quiz.id} quiz={quiz} onEdit={handleEditQuiz} onDelete={handleDeleteQuiz} />
        ))}
      </div>
    </div>
  );
};

export default QuizManagementComponent;
export type { QuizManagementComponentProps };