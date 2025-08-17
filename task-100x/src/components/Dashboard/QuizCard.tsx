import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Quiz } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

interface QuizCardProps {
  quiz: Quiz;
  onEdit: (quiz: Quiz) => void;
  onDelete: (quizId: string) => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, onEdit, onDelete }) => {
  return (
    <Card className="w-full max-w-sm bg-orange-100 border-orange-600/30 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out">
      <CardHeader className="pb-2 bg-orange-50 rounded-t-2xl">
        <CardTitle className="text-xl font-bold text-black">Quiz for Week {quiz.weekNumber}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2 bg-orange-100 rounded-b-2xl">
        <p className="text-sm text-black mb-4">Questions: {quiz.questions.length}</p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(quiz)}
            className="flex items-center gap-1 px-3 py-2 text-orange-400 border border-orange-600/50 rounded-xl hover:bg-orange-600/20 hover:text-orange-300 transition-all duration-200 ease-in-out shadow-md"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(quiz.id)}
            className="flex items-center gap-1 px-3 py-2 bg-red-700 text-white rounded-xl hover:bg-red-800 transition-all duration-200 ease-in-out shadow-md"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizCard;