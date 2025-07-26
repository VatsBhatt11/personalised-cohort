import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Quiz } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

interface QuizCardProps {
  quiz: {
    id: string;
    cohortId: string;
    weekNumber: number;
  };
  onEdit: (quiz: Quiz) => void;
  onDelete: (quizId: string) => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, onEdit, onDelete }) => {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Quiz</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-2">Week Number: {quiz.weekNumber}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(quiz)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onDelete(quiz.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizCard;