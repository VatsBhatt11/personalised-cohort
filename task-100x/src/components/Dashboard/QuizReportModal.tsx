import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DetailedQuizAttemptResponse, learner } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { isAxiosError } from 'axios';

interface QuizReportModalProps {
  attemptId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QuizReportModal = ({ attemptId, isOpen, onClose }: QuizReportModalProps) => {
  const [reportData, setReportData] = useState<DetailedQuizAttemptResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'attempted' | 'feedback'>('attempted'); // 'attempted' or 'feedback'
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen || !attemptId) return;

    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const response = await learner.getDetailedQuizReport(attemptId);
        setReportData(response);
      } catch (error) {
        if (isAxiosError(error)) {
          toast({
            variant: "destructive",
            title: "Error fetching quiz report",
            description: error.response?.data?.detail || "Please try again later.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error fetching quiz report",
            description: "An unexpected error occurred. Please try again later.",
          });
        }
        onClose(); // Close modal on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [attemptId, isOpen, onClose, toast]);

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] bg-gray-800 text-gray-200">
          <DialogHeader>
            <DialogTitle className="text-orange-400">Loading Quiz Report...</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">Loading detailed quiz report...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!reportData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] bg-gray-800 text-gray-200">
          <DialogHeader>
            <DialogTitle className="text-orange-400">Quiz Report</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">No report data available.</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-gray-800 text-gray-200">
        <DialogHeader>
          <DialogTitle className="text-orange-400">Quiz Report - Attempt ID: {reportData.id}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center space-x-4 mb-4">
          <Button
            onClick={() => setViewMode('attempted')}
            variant={viewMode === 'attempted' ? 'default' : 'outline'}
            className={viewMode === 'attempted' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'text-gray-200 border-gray-700 hover:bg-gray-700 hover:text-white'}
          >
            View Attempted Quiz
          </Button>
          <Button
            onClick={() => setViewMode('feedback')}
            variant={viewMode === 'feedback' ? 'default' : 'outline'}
            className={viewMode === 'feedback' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'text-gray-200 border-gray-700 hover:bg-gray-700 hover:text-white'}
          >
            View Feedback
          </Button>
        </div>

        {viewMode === 'attempted' && (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 text-gray-200">
            {reportData.questions.map((question, index) => (
              <div key={question.id} className="bg-gray-900 p-4 rounded-lg shadow-md border border-gray-700">
                <h4 className="text-lg font-semibold mb-2 text-orange-300">Question {index + 1}: {question.text}</h4>
                <div className="space-y-2">
                  {question.options.map(option => (
                    <div
                      key={option.id}
                      className={`p-2 rounded-md border ${option.id === question.selectedOptionId ? 'bg-blue-700 border-blue-700' : option.isCorrect ? 'bg-green-700 border-green-700' : 'border-gray-700'}`}
                    >
                      <span className={`${option.id === question.selectedOptionId ? 'font-bold' : ''}`}>
                        {option.text}
                        {option.id === question.selectedOptionId && ' (Your Answer)'}
                        {option.isCorrect && ' (Correct Answer)'}
                      </span>
                    </div>
                  ))}
                  {question.type === 'TEXT' && question.attemptedAnswerText && (
                    <div className="p-2 rounded-md border border-blue-700 bg-blue-700">
                      <span className="font-bold">Your Text Answer:</span> {question.attemptedAnswerText}
                    </div>
                  )}
                  {question.type === 'TEXT' && question.correctAnswerText && (
                    <div className="p-2 rounded-md border border-green-700 bg-green-700">
                      <span className="font-bold">Correct Text Answer:</span> {question.correctAnswerText}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'feedback' && reportData.feedbackReport && (
          <div className="bg-gray-900 p-4 rounded-lg shadow-md max-h-[60vh] overflow-y-auto border border-gray-700">
            <h4 className="text-lg font-semibold mb-2 text-orange-300">Feedback Report:</h4>
            <p className="text-gray-300 whitespace-pre-wrap">{reportData.feedbackReport.reportContent}</p>
          </div>
        )}

        {viewMode === 'feedback' && !reportData.feedbackReport && (
          <div className="bg-gray-900 p-4 rounded-lg shadow-md max-h-[60vh] overflow-y-auto border border-gray-700">
            <p className="text-gray-300">No feedback available for this attempt.</p>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button onClick={onClose} variant="outline" className="text-gray-200 border-gray-700 hover:bg-gray-700 hover:text-white">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};