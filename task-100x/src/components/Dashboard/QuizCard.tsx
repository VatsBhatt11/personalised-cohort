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
    <Card className="w-full max-w-sm bg-gray-800 border-orange-500/30 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-orange-400">Quiz for Week {quiz.weekNumber}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="text-sm text-orange-200 mb-4">Questions: {quiz.questions.length}</p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(quiz)}
            className="flex items-center gap-1 px-3 py-2 text-orange-300 border border-orange-500/50 rounded-xl hover:bg-orange-500/20 hover:text-orange-200 transition-all duration-200 ease-in-out shadow-md"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(quiz.id)}
            className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 ease-in-out shadow-md"
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