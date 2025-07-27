import React, { useState, useEffect } from 'react';
import { learner } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { isAxiosError } from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuizFeedbackProps {
  attemptId: string;
  onClose: () => void;
}

interface QuizFeedbackData {
  quiz_id: string;
  quiz_title: string;
  score: number;
  total_questions: number;
  feedback_report_content: string;
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

      <Card>
        <CardHeader>
          <CardTitle>Overall Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feedback.feedback_report_content}</p>
        </CardContent>
      </Card>
    </div>
  );
};