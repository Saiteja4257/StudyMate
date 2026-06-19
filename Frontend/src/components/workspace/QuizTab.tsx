import React, { useState, useEffect } from 'react';
import { aiAPI } from '../../services/api';
import { Brain, RefreshCw, CheckCircle2, XCircle, ArrowRight, Trophy, ArrowLeft, Calendar, ListChecks, Loader2 } from 'lucide-react';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface QuizAttempt {
  score: number;
  userAnswers: string[];
  weakTopics: string[];
  createdAt: string;
}

interface QuizStackItem {
  createdAt: string;
  questions: QuizQuestion[];
  attempts?: QuizAttempt[];
}

interface QuizTabProps {
  document: any;
  onDocumentUpdate: () => void;
}

const QuizTab: React.FC<QuizTabProps> = ({ document, onDocumentUpdate }) => {
  const quizStacks: QuizStackItem[] = document.quizzes && document.quizzes.length > 0
    ? document.quizzes
    : (document.quiz && document.quiz.length > 0 ? [{ questions: document.quiz, createdAt: document.createdAt || new Date() }] : []);

  const [loading, setLoading] = useState(false);
  const [selectedQuizIndex, setSelectedQuizIndex] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  // Load previous attempt or reset state when changing quiz version
  useEffect(() => {
    if (selectedQuizIndex !== null && quizStacks[selectedQuizIndex]?.attempts && quizStacks[selectedQuizIndex].attempts!.length > 0) {
      const attempts = quizStacks[selectedQuizIndex].attempts!;
      const lastAttempt = attempts[attempts.length - 1];
      setCurrentIndex(0);
      setSelectedOption(null);
      setUserAnswers(lastAttempt.userAnswers);
      setWeakTopics(lastAttempt.weakTopics || []);
      setFinished(true);
    } else {
      setCurrentIndex(0);
      setSelectedOption(null);
      setUserAnswers([]);
      setFinished(false);
      setWeakTopics([]);
    }
  }, [selectedQuizIndex]);

  const questions: QuizQuestion[] = selectedQuizIndex !== null && quizStacks[selectedQuizIndex] ? quizStacks[selectedQuizIndex].questions : [];

  const handleGenerate = async (regenerate = false) => {
    setLoading(true);
    setError('');
    try {
      await aiAPI.generateQuiz(document._id, regenerate);
      onDocumentUpdate();
      setSelectedQuizIndex(quizStacks.length); // The new one will be at the end
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleNext = async () => {
    if (!selectedOption || selectedQuizIndex === null) return;
    
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = selectedOption;
    setUserAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(newAnswers[currentIndex + 1] || null);
    } else {
      setFinished(true);
      setAnalyzing(true);
      const score = questions.reduce((acc, q, idx) => acc + (q.answer === newAnswers[idx] ? 1 : 0), 0);
      try {
        const res = await aiAPI.submitQuizAttempt(document._id, selectedQuizIndex, newAnswers, score);
        setWeakTopics(res.data.weakTopics || []);
        onDocumentUpdate();
      } catch (err) {
        console.error("Failed to submit quiz attempt", err);
      } finally {
        setAnalyzing(false);
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setUserAnswers([]);
    setFinished(false);
    setWeakTopics([]);
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="glass p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1">
            <div className="h-full bg-gradient-to-r from-secondary to-purple-500 animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <Brain className="w-16 h-16 text-secondary animate-bounce mb-6" />
            <h3 className="text-xl font-semibold text-white mb-2">Generating your quiz...</h3>
            <p className="text-gray-400 text-sm">Crafting unique questions based on your material</p>
          </div>
        </div>
      </div>
    );
  }

  // Quiz Hub View
  if (selectedQuizIndex === null) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-secondary" />
            <h2 className="text-2xl font-bold text-white">Quiz Hub</h2>
          </div>
          <button
            onClick={() => handleGenerate(true)}
            className="bg-gradient-to-r from-secondary to-purple-600 text-white font-medium py-2 px-5 rounded-xl transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            Generate New Quiz
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-6">{error}</p>}

        {quizStacks.length === 0 ? (
          <div className="glass p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6 animate-float">
              <Brain className="w-10 h-10 text-secondary" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">No quizzes generated yet</h3>
            <p className="text-gray-400 max-w-md mb-8 leading-relaxed">
              Generate your first quiz to test your knowledge!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizStacks.map((quiz, idx) => (
              <div key={idx} className="glass p-6 hover:border-secondary/30 transition-all group flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <span className="bg-secondary/10 text-secondary text-sm font-bold px-3 py-1 rounded-full">
                    Quiz {idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(quiz.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-gray-500" />
                  {quiz.questions.length} Questions
                </h3>

                <button
                  onClick={() => setSelectedQuizIndex(idx)}
                  className="mt-auto w-full py-2.5 bg-white/[0.04] group-hover:bg-secondary text-white font-medium rounded-xl transition-all"
                >
                  {quiz.attempts && quiz.attempts.length > 0 ? 'View Results' : 'Start Quiz'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Active Quiz Finished View
  if (finished) {
    const score = questions.reduce((acc, q, idx) => acc + (q.answer === userAnswers[idx] ? 1 : 0), 0);
    const percentage = Math.round((score / questions.length) * 100);
    
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => setSelectedQuizIndex(null)}
          className="mb-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quiz Hub
        </button>

        <div className="glass p-12 text-center relative overflow-hidden mb-8">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-secondary/15 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <div className="w-28 h-28 bg-gradient-to-br from-secondary to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-secondary/30">
              {percentage >= 70 ? (
                <Trophy className="w-12 h-12 text-white" />
              ) : (
                <span className="text-3xl font-bold text-white">{percentage}%</span>
              )}
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {percentage >= 90 ? 'Outstanding!' : percentage >= 70 ? 'Great Job!' : percentage >= 50 ? 'Good Effort!' : 'Keep Studying!'}
            </h2>
            <p className="text-gray-400 mb-8 text-lg">
              You scored <span className="text-white font-semibold">{score}</span> out of <span className="text-white font-semibold">{questions.length}</span>
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRestart}
                className="px-5 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-white rounded-xl transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retake Quiz
              </button>
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        {analyzing ? (
          <div className="glass p-6 mb-8 flex items-center gap-4 text-secondary">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-medium">AI is analyzing your performance...</span>
          </div>
        ) : weakTopics.length > 0 ? (
          <div className="glass p-6 mb-8 border border-secondary/20 bg-secondary/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-secondary" />
              <h3 className="text-lg font-bold text-white">Areas for Improvement</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Based on your incorrect answers, the AI suggests focusing your studies on the following topics:
            </p>
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((topic, idx) => (
                <span key={idx} className="bg-secondary/10 border border-secondary/20 text-secondary px-3 py-1.5 rounded-lg text-sm font-medium">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Review Answers */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white mb-4">Review Your Answers</h3>
          {questions.map((q, idx) => {
            const isCorrect = userAnswers[idx] === q.answer;
            return (
              <div key={idx} className="glass p-6 border-l-4" style={{ borderLeftColor: isCorrect ? '#10b981' : '#ef4444' }}>
                <h4 className="text-lg font-medium text-white mb-4">{idx + 1}. {q.question}</h4>
                <div className="space-y-2">
                  {q.options.map((opt, oIdx) => {
                    const isUserPick = userAnswers[idx] === opt;
                    const isActualAnswer = q.answer === opt;
                    
                    let bg = 'bg-white/[0.02] border-white/[0.06] text-gray-400';
                    if (isActualAnswer) {
                      bg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                    } else if (isUserPick && !isCorrect) {
                      bg = 'bg-red-500/10 border-red-500/30 text-red-400';
                    }

                    return (
                      <div key={oIdx} className={`px-4 py-3 rounded-lg border flex items-center justify-between ${bg}`}>
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded bg-black/20 flex items-center justify-center text-xs font-mono flex-shrink-0">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {isActualAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                        {isUserPick && !isCorrect && <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Active Quiz Playing View
  const currentQ = questions?.[currentIndex];

  if (!currentQ) {
    return (
    null
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedQuizIndex(null)}
            className="p-2 rounded-full hover:bg-white/[0.1] transition-colors text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-secondary font-bold tracking-wider uppercase text-sm bg-white/[0.05] px-3 py-1 rounded-full">
              Quiz {selectedQuizIndex + 1}
            </span>
            <span className="text-gray-400 text-sm">
              Question {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/[0.04] rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-secondary to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="glass p-8">
        <h3 className="text-xl font-semibold text-white mb-8 leading-relaxed">
          {currentQ.question}
        </h3>

        <div className="space-y-3 mb-8">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedOption === option;

            let classes = 'w-full text-left p-4 rounded-xl border transition-all duration-300 ';
            classes += isSelected
              ? 'border-secondary bg-secondary/10 text-white shadow-[0_0_15px_rgba(139,92,246,0.15)]'
              : 'border-white/[0.06] bg-white/[0.02] text-gray-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-white';

            return (
              <button key={idx} onClick={() => handleSelect(option)} className={classes}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-sm font-mono text-gray-400 flex-shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-base">{option}</span>
                  </div>
                  {isSelected && <div className="w-3 h-3 rounded-full bg-secondary flex-shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            disabled={!selectedOption}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
              selectedOption
                ? 'bg-secondary hover:bg-secondary/90 text-white shadow-lg shadow-secondary/20'
                : 'bg-white/[0.04] text-gray-500 cursor-not-allowed'
            }`}
          >
            {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizTab;
