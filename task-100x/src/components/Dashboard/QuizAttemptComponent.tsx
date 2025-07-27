import React, { useState, useEffect } from 'react';
import { Quiz, Question, Option, QuizAttemptStatus, QuizFeedbackData, learner } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';

interface Answer {
  questionId: string;
  selectedOptionId: string;
}

interface QuizAttemptProps {
  quizId: string;
  onAttemptComplete: (attemptId: string) => void;
  onClose: () => void;
}

export const QuizAttemptComponent = ({ quizId, onAttemptComplete }: QuizAttemptProps) => {
  const [quizData, setQuizData] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await learner.getQuiz(quizId);

        setQuizData(response);
      } catch (error) {
        if (isAxiosError(error)) {
          toast({
            variant: "destructive",
            title: "Error fetching quiz",
            description: error.response?.data?.detail || "Please try again later.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error fetching quiz",
            description: "An unexpected error occurred. Please try again later.",
          });
        }
      }
    };
    fetchQuiz();
  }, [quizId, toast]);

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setAnswers(prev => {
      const existingAnswerIndex = prev.findIndex(ans => ans.questionId === questionId);
      if (existingAnswerIndex > -1) {
        const newAnswers = [...prev];
        newAnswers[existingAnswerIndex] = { questionId, selectedOptionId: optionId };
        return newAnswers;
      } else {
        return [...prev, { questionId, selectedOptionId: optionId }];
      }
    });
  };

  const handleNext = () => {
    if (quizData && currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!quizData) return;
    try {
      const formattedAnswers = answers.map(ans => ({
        questionId: ans.questionId,
        selectedOptionId: ans.selectedOptionId,
      }));
      const response = await learner.submitQuizAttempt(quizId, formattedAnswers);
      toast({
        title: "Quiz Submitted",
        description: "Your quiz attempt has been submitted successfully.",
      });
      onAttemptComplete(response?.feedbackReport?.quizAttemptId);
    } catch (error) {
      console.error(error)
      if (isAxiosError(error)) {
        toast({
          variant: "destructive",
          title: "Error submitting quiz",
          description: error.response?.data?.detail || "Please try again later.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error submitting quiz",
          description: "An unexpected error occurred. Please try again later.",
        });
      }
    }
  };

  if (!quizData) {
    return <div>No quiz</div>;
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const selectedAnswer = answers.find(ans => ans.questionId === currentQuestion.id)?.selectedOptionId;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Quiz for Week {quizData.weekNumber}</h2>

      <div className="bg-card p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4">Question {currentQuestionIndex + 1} of {quizData.questions.length}</h3>
        <p className="text-lg mb-4">{currentQuestion.text}</p>
        <div className="space-y-3">
          {currentQuestion.options.map(option => (
            <Button
              key={option.id}
              variant={selectedAnswer === option.id ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => handleOptionSelect(currentQuestion.id, option.id)}
            >
              {option.text}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
          Previous
        </Button>
        {currentQuestionIndex === quizData.questions.length - 1 ? (
          <Button onClick={handleSubmit} disabled={answers.length !== quizData.questions.length}>
            Submit Quiz
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!selectedAnswer}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
};