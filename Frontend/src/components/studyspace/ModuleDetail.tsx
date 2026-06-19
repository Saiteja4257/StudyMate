import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { studySpaceAPI } from '../../services/api';
import { 
  Loader2, 
  CheckCircle2, 
  BookOpen, 
  Lightbulb, 
  Layers, 
  HelpCircle, 
  Share2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  MessageSquare
} from 'lucide-react';
import StudySpaceTutor from './StudySpaceTutor';

interface ModuleDetailProps {
  spaceId: string;
  module: any;
  onProgressUpdate: (moduleId: string, completed: boolean) => void;
  activeTab: 'notes' | 'flashcards' | 'quiz' | 'visual' | 'chat';
}

const ModuleDetail: React.FC<ModuleDetailProps> = ({ spaceId, module, onProgressUpdate, activeTab }) => {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Flashcard state
  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  useEffect(() => {
    // Reset states when module changes
    setCurrentCard(0);
    setIsFlipped(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
    
    if (module.contentGenerated) {
      setContent(module);
    } else {
      loadContent();
    }
  }, [module._id]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const res = await studySpaceAPI.getModuleContent(spaceId, module._id);
      setContent(res.data);
    } catch (error) {
      console.error("Failed to load module content:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = () => {
    let score = 0;
    content.quizzes.forEach((q: any, idx: number) => {
      if (quizAnswers[idx] === q.answer) score++;
    });
    setQuizScore(score);
    setQuizSubmitted(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-gray-400">AI is generating detailed content for this module...</p>
      </div>
    );
  }

  if (!content) return null;

  return (
    <div className="animate-fade-in">
      {/* Header section */}
      <div className="mb-8">
        <div className="flex items-center justify-end mb-4 ">
          {/* <h1 className="text-3xl font-bold text-white">{content.title}</h1> */}
          <button
            onClick={() => onProgressUpdate(module._id, !module.completed)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              module.completed 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30' 
                : 'bg-white/[0.05] text-gray-300 border border-white/[0.1] hover:bg-white/[0.1]'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {module.completed ? 'Completed' : 'Mark Complete'}
          </button>
        </div>
        {/* <p className="text-gray-400 text-lg leading-relaxed">{content.summary}</p> */}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-8 animate-fade-in">
            {content.keyConcepts?.length > 0 && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-indigo-300 mb-4">
                  <Lightbulb className="w-5 h-5" /> Key Concepts
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {content.keyConcepts.map((concept: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                      <span>{concept}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="prose prose-invert prose-indigo max-w-none prose-headings:text-white prose-p:text-gray-300 prose-a:text-indigo-400 prose-strong:text-white">
              <ReactMarkdown>{content.detailedNotes || "No detailed notes available."}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Flashcards Tab */}
        {activeTab === 'flashcards' && content.flashcards && (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="text-sm text-gray-400 mb-6">
              Card {currentCard + 1} of {content.flashcards.length}
            </div>
            
            <div 
              className="relative w-full max-w-2xl aspect-[3/2] perspective-1000 cursor-pointer group"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className={`w-full h-full duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front */}
                <div className="absolute inset-0 backface-hidden bg-[#151515] border border-white/[0.1] rounded-3xl p-8 flex flex-col items-center justify-center text-center group-hover:border-indigo-500/50 transition-colors shadow-2xl">
                  <span className="absolute top-6 left-6 text-xs font-bold tracking-widest text-indigo-500/50 uppercase">Question</span>
                  <h3 className="text-2xl sm:text-3xl font-medium text-white leading-tight">
                    {content.flashcards[currentCard].front}
                  </h3>
                  <p className="absolute bottom-6 text-sm text-gray-500">Click to flip</p>
                </div>
                
                {/* Back */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600/10 border border-indigo-500/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
                  <span className="absolute top-6 left-6 text-xs font-bold tracking-widest text-indigo-400/50 uppercase">Answer</span>
                  <div className="prose prose-invert prose-indigo">
                    <ReactMarkdown>{content.flashcards[currentCard].back}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-8">
              <button
                onClick={() => { setCurrentCard(Math.max(0, currentCard - 1)); setIsFlipped(false); }}
                disabled={currentCard === 0}
                className="p-3 rounded-full bg-white/[0.05] text-white hover:bg-white/[0.1] disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => { setIsFlipped(false); }}
                className="p-3 rounded-full bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-all"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={() => { setCurrentCard(Math.min(content.flashcards.length - 1, currentCard + 1)); setIsFlipped(false); }}
                disabled={currentCard === content.flashcards.length - 1}
                className="p-3 rounded-full bg-white/[0.05] text-white hover:bg-white/[0.1] disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && content.quizzes && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            {quizSubmitted ? (
              <div className="bg-[#151515] border border-white/[0.1] rounded-3xl p-8 text-center mb-8">
                <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-indigo-400">
                    {Math.round((quizScore / content.quizzes.length) * 100)}%
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Quiz Completed!</h3>
                <p className="text-gray-400 mb-6">You got {quizScore} out of {content.quizzes.length} questions correct.</p>
                <button
                  onClick={() => { setQuizSubmitted(false); setQuizAnswers({}); }}
                  className="bg-white/[0.05] hover:bg-white/[0.1] text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-white">Module Quiz</h3>
                <span className="text-sm text-gray-400">{Object.keys(quizAnswers).length} / {content.quizzes.length} answered</span>
              </div>
            )}

            <div className="space-y-6">
              {content.quizzes.map((q: any, qIdx: number) => (
                <div key={qIdx} className="bg-[#151515] border border-white/[0.1] rounded-2xl p-6">
                  <h4 className="text-lg font-medium text-white mb-4">{qIdx + 1}. {q.question}</h4>
                  <div className="space-y-3">
                    {q.options.map((opt: string, oIdx: number) => {
                      const isSelected = quizAnswers[qIdx] === opt;
                      const isCorrect = q.answer === opt;
                      const showResult = quizSubmitted;
                      
                      let btnClass = "w-full text-left p-4 rounded-xl border text-sm transition-all ";
                      if (showResult) {
                        if (isCorrect) btnClass += "bg-emerald-500/10 border-emerald-500/50 text-emerald-300";
                        else if (isSelected && !isCorrect) btnClass += "bg-red-500/10 border-red-500/50 text-red-300";
                        else btnClass += "bg-[#1a1a1a] border-white/[0.05] text-gray-500 opacity-50";
                      } else {
                        btnClass += isSelected 
                          ? "bg-indigo-500/20 border-indigo-500 text-indigo-300" 
                          : "bg-[#1a1a1a] border-white/[0.05] text-gray-300 hover:border-white/[0.2] hover:bg-[#222]";
                      }

                      return (
                        <button
                          key={oIdx}
                          disabled={showResult}
                          onClick={() => setQuizAnswers({ ...quizAnswers, [qIdx]: opt })}
                          className={btnClass}
                        >
                          <div className="flex items-center justify-between">
                            <span>{opt}</span>
                            {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {quizSubmitted && q.explanation && (
                    <div className="mt-4 p-4 rounded-xl bg-white/[0.03] text-sm text-gray-400">
                      <span className="font-semibold text-white">Explanation: </span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!quizSubmitted && (
              <div className="mt-8 flex justify-end">
                <button
                  onClick={submitQuiz}
                  disabled={Object.keys(quizAnswers).length < content.quizzes.length}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Quiz
                </button>
              </div>
            )}
          </div>
        )}

        {/* Visual Tab */}
        {activeTab === 'visual' && content.visualTopics && (
          <div className="animate-fade-in h-[600px] flex flex-col bg-[#151515] border border-white/[0.1] rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-white/[0.05]">
              <h3 className="text-xl font-bold text-white mb-2">{content.visualTopics.title}</h3>
              <p className="text-gray-400 text-sm">{content.visualTopics.explanation}</p>
            </div>
            <div className="flex-1 w-full relative">
              <ReactFlow
                nodes={content.visualTopics.nodes}
                edges={content.visualTopics.edges}
                fitView
                className="bg-[#0a0a0a]"
                colorMode="dark"
              >
                <Background gap={20} color="#333" />
                <Controls />
              </ReactFlow>
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <StudySpaceTutor spaceId={spaceId} moduleId={module._id} />
        )}
      </div>
    </div>
  );
};

export default ModuleDetail;
