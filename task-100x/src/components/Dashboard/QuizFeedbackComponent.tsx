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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFeedback = async () => {
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeedback();
  }, [attemptId, toast]);

  if (isLoading) {
    return <div>Loading feedback...</div>;
  }

  if (!feedback) {
    return <div>No feedback available.</div>;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg text-black">
      <h2 className="text-2xl font-bold mb-4 text-black">Feedback for {feedback.quiz_title}</h2>
      <p className="text-xl mb-6 text-black">Your Score: <span className="text-black">{feedback.score}</span>/<span className="text-black">{feedback.total_questions}</span></p>

      <Card className="bg-orange-100 border border-orange-600/30 shadow-lg">
        <CardHeader className="border-b border-orange-600/30">
          <CardTitle className="text-orange-300">Overall Feedback</CardTitle>
        </CardHeader>
        <CardContent className="bg-orange-100">
          <p className="text-sm text-black whitespace-pre-wrap">{feedback.feedback_report_content}</p>
        </CardContent>
      </Card>
    </div>
  );
};