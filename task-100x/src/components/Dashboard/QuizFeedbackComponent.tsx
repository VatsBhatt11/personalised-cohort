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
    <div className="p-4 bg-gray-800 rounded-lg shadow-lg text-white">
      <h2 className="text-2xl font-bold mb-4 text-orange-400">Feedback for {feedback.quiz_title}</h2>
      <p className="text-xl mb-6">Your Score: <span className="text-orange-300">{feedback.score}</span>/<span className="text-orange-300">{feedback.total_questions}</span></p>

      <Card className="bg-gray-900 border border-orange-500/30 shadow-lg">
        <CardHeader className="border-b border-orange-500/30">
          <CardTitle className="text-orange-400">Overall Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{feedback.feedback_report_content}</p>
        </CardContent>
      </Card>
    </div>
  );
};