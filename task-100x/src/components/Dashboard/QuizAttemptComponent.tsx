import { Quiz, Question, Option, learner, QuizAttemptStatus, QuizFeedbackData } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';

interface Answer {
  questionId: string;
  selectedOptionId?: string;
  shortAnswerText?: string;
}

interface QuizAttemptProps {
  quizId: string;
  onAttemptComplete: (feedback: QuizFeedbackData) => void;
  onClose: () => void;
}

export const QuizAttemptComponent = ({ quizId, onAttemptComplete }: QuizAttemptProps) => {
  const [quizData, setQuizData] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [attemptStatus, setAttemptStatus] = useState<QuizAttemptStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statusResponse = await learner.checkQuizAttemptStatus(quizId);
        setAttemptStatus(statusResponse);

        if (!statusResponse.hasAttempted) {
          const quizResponse = await learner.getQuiz(quizId);
          setQuizData(quizResponse);
        }
      } catch (error) {
        if (isAxiosError(error)) {
          toast({
            variant: "destructive",
            title: "Error fetching data",
            description: error.response?.data?.detail || "Please try again later.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error fetching data",
            description: "An unexpected error occurred. Please try again later.",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [quizId, toast]);

  const handleAnswerChange = (questionId: string, value: string, type: "option" | "text") => {
    setAnswers(prev => {
      const existingAnswerIndex = prev.findIndex(ans => ans.questionId === questionId);
      if (existingAnswerIndex > -1) {
        const newAnswers = [...prev];
        if (type === "option") {
          newAnswers[existingAnswerIndex] = { questionId, selectedOptionId: value };
        } else {
          newAnswers[existingAnswerIndex] = { questionId, shortAnswerText: value };
        }
        return newAnswers;
      } else {
        if (type === "option") {
          return [...prev, { questionId, selectedOptionId: value }];
        } else {
          return [...prev, { questionId, shortAnswerText: value }];
        }
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
        shortAnswerText: ans.shortAnswerText,
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

  if (isLoading) {
    return <div>Loading quiz...</div>;
  }

  if (attemptStatus?.hasAttempted) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Quiz Already Attempted</h2>
        <p className="mb-4">You have already completed this quiz.</p>
        <Button onClick={async () => {
          if (attemptStatus?.lastAttemptId) {
            const feedback = await learner.getQuizFeedback(attemptStatus.lastAttemptId);
            onAttemptComplete(feedback);
          }
        }}>View Report</Button>
      </div>
    );
  }

  if (!quizData) {
    return <div>No quiz data available.</div>;
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const selectedAnswer = answers.find(ans => ans.questionId === currentQuestion.id);

  const isShortAnswer = currentQuestion.questionType === "SHORT_ANSWER";

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Quiz for Week {quizData.weekNumber}</h2>

      <div className="bg-card p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4">Question {currentQuestionIndex + 1} of {quizData.questions.length}</h3>
        <p className="text-lg mb-4">{currentQuestion.questionText}</p>
          <div className="space-y-3">
            {isShortAnswer ? (
              <Input
                type="text"
                placeholder="Type your answer here..."
                value={selectedAnswer?.shortAnswerText || ""}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value, "text")}
              />
            ) : (
              currentQuestion.options.map(option => (
                <Button
                  key={option.id}
                  variant={selectedAnswer?.selectedOptionId === option.id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => handleAnswerChange(currentQuestion.id, option.id, "option")}
                >
                  {option.optionText}
                </Button>
              ))
            )}
          </div>
      </div>

      <div className="flex justify-between">
        <Button onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
          Previous
        </Button>
        {currentQuestionIndex === quizData.questions.length - 1 ? (
          <Button onClick={handleSubmit} disabled={!selectedAnswer?.selectedOptionId && !selectedAnswer?.shortAnswerText}>
            Submit Quiz
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!selectedAnswer?.selectedOptionId && !selectedAnswer?.shortAnswerText}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
};