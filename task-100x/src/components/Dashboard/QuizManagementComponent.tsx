import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import QuizForm from './QuizForm';
import QuizCard from './QuizCard';

import { Quiz, Option, Question } from '../../lib/api';



interface QuizManagementComponentProps {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  handleCreateQuiz: () => void;
  handleEditQuiz: (quiz: Quiz) => void;
  handleDeleteQuiz: (quizId: string) => void;
  handleSaveQuiz: (quizData: Quiz) => void;
  cohortId: string | null; // Add cohortId prop
  totalWeeks: number; // Add totalWeeks prop

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
}) => {

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Quiz Management</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
              <Button onClick={handleCreateQuiz}>Create New Quiz</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>{currentQuiz ? 'Edit Quiz' : 'Create New Quiz'}</DialogTitle>
              </DialogHeader>
              {cohortId && <QuizForm initialData={currentQuiz} onSave={handleSaveQuiz} cohortId={cohortId} totalWeeks={totalWeeks} />}
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {quizzes?.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} onEdit={handleEditQuiz} onDelete={handleDeleteQuiz} />
          ))}
        </div>
      </div>
    );
};

export default QuizManagementComponent;
export type { QuizManagementComponentProps };