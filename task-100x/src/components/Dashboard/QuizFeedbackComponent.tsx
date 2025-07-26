import React, { useState, useEffect } from 'react';
import { learner } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { isAxiosError } from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuizFeedbackProps {
  attemptId: string;
  onClose: () => void;
}

interface FeedbackQuestion {
  question_id: string;
  question_text: string;
  user_answer_id: string;
  correct_answer_id: string;
  correct_answer_text: string;
  is_correct: boolean;
  explanation: string;
}

interface QuizFeedbackData {
  quiz_id: string;
  quiz_title: string;
  score: number;
  total_questions: number;
  feedback_questions: FeedbackQuestion[];
}

export const QuizFeedbackComponent = ({ attemptId }: QuizFeedbackProps) => {
  const [feedback, setFeedback] = useState<QuizFeedbackData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const response = await learner.getQuizFeedback(attemptId);
        setFeedback(response);
      } catch (error) {
        if (isAxiosError(error)) {
          toast({
            variant: "destructive",
            title: "Error fetching feedback",
            description: error.response?.data?.detail || "Please try again later.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error fetching feedback",
            description: "An unexpected error occurred. Please try again later.",
          });
        }
      }
    };
    fetchFeedback();
  }, [attemptId, toast]);

  if (!feedback) {
    return <div>Loading feedback...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Feedback for {feedback.quiz_title}</h2>
      <p className="text-xl mb-6">Your Score: {feedback.score}/{feedback.total_questions}</p>

      <div className="space-y-6">
        {feedback.feedback_questions.map((q, index) => (
          <Card key={q.question_id} className={q.is_correct ? "border-green-500" : "border-red-500"}>
            <CardHeader>
              <CardTitle>Question {index + 1}: {q.question_text}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">Your Answer: <span className={q.is_correct ? "text-green-500" : "text-red-500"}>{q.user_answer_id}</span></p>
              <p className="mb-2">Correct Answer: <span className="text-green-500">{q.correct_answer_text}</span></p>
              <p className="text-sm text-muted-foreground">Explanation: {q.explanation}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};