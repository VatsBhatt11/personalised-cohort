import React, { useState, useEffect } from 'react';
import { Quiz, Question, Option, QuizAttemptStatus, QuizFeedbackData, learner } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { QuizReportModal } from './QuizReportModal';

interface Answer {
  questionId: string;
  selectedOptionId: string;
}

interface QuizAttemptComponentProps {
  quizId: string;
  resourceId: string; // Add resourceId here
  onAttemptComplete: (attemptId: string) => void;
  onClose: () => void; // Add onClose prop
}

export const QuizAttemptComponent = ({ quizId, resourceId, onAttemptComplete, onClose }: QuizAttemptComponentProps) => {
  const [quizData, setQuizData] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showReportButton, setShowReportButton] = useState<boolean>(false); // New state
  const [submittedAttemptId, setSubmittedAttemptId] = useState<string | null>(null); // New state
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false); // New state for report modal
  const { toast } = useToast();

  useEffect(() => {
    setStartTime(Date.now());

    const handleBeforeUnload = () => {
      if (startTime !== null) {
        const elapsed = (Date.now() - startTime) / 1000;
        setTimeSpentSeconds(prev => prev + elapsed);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (startTime !== null) {
        const elapsed = (Date.now() - startTime) / 1000;
        setTimeSpentSeconds(prev => prev + elapsed);
      }
    };
  }, [startTime]);

  // useEffect(() => {
  //   return () => {
  //     if (startTime !== null) {
  //       const elapsed = (Date.now() - startTime) / 1000;
  //       const finalTimeSpent = timeSpentSeconds + elapsed;
  //       if (finalTimeSpent > 0) {
  //         learner.trackQuizTime(quizId, Math.round(finalTimeSpent)).catch(error => {
  //           console.error("Error tracking quiz time on unmount:", error);
  //         });
  //       }
  //     }
  //     onClose();
  //   };
  // }, [quizId, startTime, timeSpentSeconds, onClose]);

  useEffect(() => {
    const fetchQuiz = async () => {
      setIsLoading(true);
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
      } finally {
        setIsLoading(false);
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
    setIsLoading(true);
    try {
      const formattedAnswers = answers.map(ans => ({
        questionId: ans.questionId,
        selectedOptionId: ans.selectedOptionId,
      }));
      const response = await learner.submitQuizAttempt(quizId, formattedAnswers, resourceId);
      toast({
        title: "Quiz Submitted",
        description: "Your quiz attempt has been submitted successfully.",
      });
      setSubmittedAttemptId(response?.feedbackReport?.quizAttemptId || null);
      setShowReportButton(true); // Show the report button
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
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading quiz...</div>;
  }

  if (!quizData) {
    return <div>No quiz data available.</div>;
  }

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const selectedAnswer = answers.find(ans => ans.questionId === currentQuestion.id)?.selectedOptionId;

  if (showReportButton && submittedAttemptId) {
    return (
      <div className="p-4 bg-orange-100 rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold mb-4 text-orange-400">Quiz Submitted!</h2>
        <p className="text-lg mb-6 text-gray-300">You can now view your detailed report or close this window.</p>
        <div className="flex justify-center space-x-4">
          <Button onClick={() => setIsReportModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white">
            View Report
          </Button>
          <Button onClick={() => onAttemptComplete(submittedAttemptId || '')} variant="outline" className="text-white border-gray-700 hover:bg-gray-800">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-orange-100 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-orange-400">Quiz for Week {quizData.weekNumber}</h2>

      <div className="bg-orange-300 p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-xl font-semibold mb-4 text-orange-300">Question {currentQuestionIndex + 1} of {quizData.questions.length}</h3>
        <p className="text-lg mb-4 text-gray-200">{currentQuestion.text}</p>
          <div className="space-y-3 text-white">
          {currentQuestion.options.map(option => (
            <Button
                key={option.id}
                variant="outline"
                className={`w-full justify-start ${selectedAnswer === option.id ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-700 hover:bg-gray-600'} text-white border-gray-700 focus:ring-orange-500`}
                onClick={() => handleOptionSelect(currentQuestion.id, option.id)}
              >
                {option.text}
              </Button>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button onClick={handlePrevious} disabled={currentQuestionIndex === 0 || isLoading}>
          Previous
        </Button>
        {currentQuestionIndex === quizData.questions.length - 1 ? (
          <Button onClick={handleSubmit} disabled={answers.length !== quizData.questions.length || isLoading}>
            {isLoading ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!selectedAnswer || isLoading}>
            Next
          </Button>
        )}
      </div>

      {isReportModalOpen && submittedAttemptId && (
      <QuizReportModal
        attemptId={submittedAttemptId}
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
        }}
      />
    )}
    </div>

    
)}