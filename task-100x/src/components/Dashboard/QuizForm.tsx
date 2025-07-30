import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Quiz, Option, Question } from "../../lib/api";
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface QuizFormProps {
  initialData: Quiz | null;
  onSave: (quizData: Quiz) => void;
  cohortId: string;
  totalWeeks: number;
}

const QuizForm: React.FC<QuizFormProps> = ({
  initialData,
  onSave,
  cohortId,
  totalWeeks,
}) => {
  const [formState, setFormState] = useState<Quiz>(initialData || {
    cohortId: cohortId,
    weekNumber: 1,
    questions: [],
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    if (initialData) {
      setFormState(initialData);
      setCurrentQuestionIndex(0); // Reset to first question when initialData changes
    } else {
      setFormState({
        cohortId: cohortId,
        weekNumber: 1,
        questions: [],
      });
      setCurrentQuestionIndex(0);
    }
  }, [initialData, cohortId]);

  useEffect(() => {
    // Adjust currentQuestionIndex if questions array becomes empty or index is out of bounds
    if (formState.questions.length === 0 && currentQuestionIndex !== 0) {
      setCurrentQuestionIndex(0);
    } else if (currentQuestionIndex >= formState.questions.length && formState.questions.length > 0) {
      setCurrentQuestionIndex(formState.questions.length - 1);
    }
  }, [formState.questions.length, currentQuestionIndex]);



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: name === 'weekNumber' ? Number(value) : value,
    }));
  };

  const handleQuestionChange = (index: number, field: 'questionText' | 'questionType', value: string | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER') => {
    const newQuestions = [...formState.questions];
    if (field === 'questionText') {
      newQuestions[index].questionText = value as string;
    } else if (field === 'questionType') {
      newQuestions[index].questionType = value as 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
    }
    setFormState(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleOptionChange = (qIndex: number, oIndex: number, field: 'optionText' | 'isCorrect', value: string | boolean) => {
    const newQuestions = [...formState.questions];
    const newOptions = [...newQuestions[qIndex].options];
    if (field === 'optionText') {
      newOptions[oIndex].optionText = value as string;
    } else if (field === 'isCorrect') {
      newOptions[oIndex].isCorrect = value as boolean;
    }
    newQuestions[qIndex].options = newOptions;
    setFormState(prev => ({ ...prev, questions: newQuestions }));
  };

  const addQuestion = () => {
    setFormState(prev => ({
      ...prev,
      questions: [
            ...prev.questions,
            {
              questionText: '', // Initialize with empty string
              questionType: 'MULTIPLE_CHOICE',
              options: [{ optionText: '', isCorrect: false, id: undefined }],
            },
          ],
        }));
    setCurrentQuestionIndex(formState.questions.length); // Navigate to the newly added question
  };

  const addOption = (qIndex: number) => {
    const newQuestions = [...formState.questions];
    newQuestions[qIndex].options.push({ optionText: '', isCorrect: false, id: undefined }); // id is optional
    setFormState(prev => ({ ...prev, questions: newQuestions }));
  };

  const removeQuestion = (index: number) => {
    setFormState(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index),
    }));
    if (currentQuestionIndex > 0 && currentQuestionIndex === formState.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...formState.questions];
    newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
    setFormState(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleSubmit = () => {
    console.log("Quiz form state on submit:", formState);
    onSave(formState);
  };

  const navigateQuestions = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
    } else {
      setCurrentQuestionIndex(prev => Math.min(formState.questions.length - 1, prev + 1));
    }
  };

  const currentQuestion = formState.questions[currentQuestionIndex];

  return (
    <div className="grid gap-4 py-4 max-h-[calc(100vh-150px)] overflow-y-auto">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="week-select" className="text-right">Week Number</Label>
        <Select
          onValueChange={(value) => setFormState(prev => ({ ...prev, weekNumber: Number(value) }))}
          value={String(formState.weekNumber)}
        >
          <SelectTrigger id="week-select" className="col-span-3">
            <SelectValue placeholder="Select a week" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
              <SelectItem key={week} value={String(week)}>
                Week {week}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <h3 className="text-xl font-semibold mt-4">Questions</h3>
      {formState.questions.length > 0 ? (
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateQuestions('prev')}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-medium">
            Question {currentQuestionIndex + 1} of {formState.questions.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateQuestions('next')}
            disabled={currentQuestionIndex === formState.questions.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {currentQuestion ? (
        <Card key={currentQuestion.id || currentQuestionIndex} className="mb-4 p-4">
          <CardHeader className="flex flex-row justify-between items-center p-0 pb-4">
            <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
            <Button variant="destructive" size="sm" onClick={() => removeQuestion(currentQuestionIndex)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid gap-2 mb-4">
              <Label htmlFor={`questionText-${currentQuestionIndex}`}>Question Text</Label>
              <Input id={`questionText-${currentQuestionIndex}`} value={currentQuestion.questionText} onChange={(e) => handleQuestionChange(currentQuestionIndex, 'questionText', e.target.value)} />
            </div>
            <div className="grid gap-2 mb-4">
              <Label htmlFor={`questionType-${currentQuestionIndex}`}>Question Type</Label>
              <Select value={currentQuestion.questionType} onValueChange={(value: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER') => handleQuestionChange(currentQuestionIndex, 'questionType', value)}>
                <SelectTrigger id={`questionType-${currentQuestionIndex}`}><SelectValue placeholder="Select a type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                  <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                  <SelectItem value="SHORT_ANSWER">Short Answer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {currentQuestion.questionType !== 'SHORT_ANSWER' && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Options</h4>
                <div className="max-h-40 overflow-y-auto pr-2">
                {(currentQuestion.options || []).map((opt, oIndex) => (
                  <div key={oIndex} className="flex items-center gap-2 mb-2">
                    <Input
                      value={opt.optionText}
                      onChange={(e) => handleOptionChange(currentQuestionIndex, oIndex, 'optionText', e.target.value)}
                      placeholder="Option text" 
                    />
                    <input
                      type="checkbox"
                      checked={opt.isCorrect}
                      onChange={(e) => handleOptionChange(currentQuestionIndex, oIndex, 'isCorrect', e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600"
                    />
                    <Label>Correct</Label>
                    <Button variant="ghost" size="sm" onClick={() => removeOption(currentQuestionIndex, oIndex)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => addOption(currentQuestionIndex)} className="mt-2">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-center text-gray-500">No questions yet. Click "Add Question" to start.</p>
      )}
      <div className="flex justify-between mt-4">
        <Button type="button" onClick={addQuestion}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Question
        </Button>
        <Button type="button" onClick={handleSubmit}>
          Save Quiz
        </Button>
      </div>
    </div>
  );
};

export default QuizForm;