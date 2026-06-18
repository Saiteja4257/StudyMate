import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, BookOpen, ChevronLeft, Plus, CheckCircle2, Circle, Sparkles, Trash2, X, AlertCircle, Brain } from 'lucide-react';
import { studyPlanAPI, documentAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';
import ConfirmModal from '../components/common/ConfirmModal';

const StudyPlanner = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Form State
  const [examDate, setExamDate] = useState('');
  const [hours, setHours] = useState('2');
  const [subjects, setSubjects] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Drawer State
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [taskContent, setTaskContent] = useState<any>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);
  
  // Modal state
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, planId: string | null}>({ isOpen: false, planId: null });

  useEffect(() => {
    fetchPlans();
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await documentAPI.getAll();
      setDocuments(res.data || []);
    } catch (error) {
      console.error('Failed to fetch documents', error);
    }
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await studyPlanAPI.getAll();
      setPlans(res.data.studyPlans || []);
    } catch (error) {
      console.error('Failed to fetch study plans', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const subjectArray = subjects.split(',').map(s => s.trim()).filter(Boolean);
    const finalSubjects = [...new Set([...subjectArray, ...selectedDocs])];
    if (!examDate || !hours || finalSubjects.length === 0) return;

    try {
      setGenerating(true);
      await studyPlanAPI.generate({
        examDate: new Date(examDate),
        availableHoursPerDay: Number(hours),
        subjects: finalSubjects
      });
      setShowForm(false);
      fetchPlans();
      setSelectedDocs([]);
      setSubjects('');
    } catch (error) {
      console.error('Failed to generate plan', error);
      alert('Failed to generate study plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleTaskCompletion = async (planId: string, task: any) => {
    try {
      const newStatus = !task.completed;
      const updatedPlans = plans.map(p => {
        if (p._id === planId) {
          const updatedPlan = { ...p };
          const taskIndex = updatedPlan.generatedPlan.findIndex((t: any) => t.id === task.id);
          if (taskIndex !== -1) {
            updatedPlan.generatedPlan[taskIndex].completed = newStatus;
            const completedCount = updatedPlan.generatedPlan.filter((t: any) => t.completed).length;
            updatedPlan.progress = Math.round((completedCount / updatedPlan.generatedPlan.length) * 100);
          }
          return updatedPlan;
        }
        return p;
      });
      setPlans(updatedPlans);
      
      if (selectedTask?.id === task.id) {
        setSelectedTask({ ...selectedTask, completed: newStatus });
      }

      await studyPlanAPI.updateTask(planId, task.id, newStatus);
    } catch (error) {
      console.error('Failed to toggle task', error);
      fetchPlans();
    }
  };

  const handleOpenTask = async (planId: string, task: any) => {
    setSelectedTask(task);
    setActivePlanId(planId);
    setTaskContent(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizPassed(task.completed);
    
    try {
      setLoadingContent(true);
      const res = await studyPlanAPI.getTaskContent(planId, task.id);
      setTaskContent(res.data.content);
    } catch (error) {
      console.error('Failed to load task content', error);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleQuizSubmit = async () => {
    if (!taskContent?.quiz) return;
    
    setQuizSubmitted(true);
    let correctCount = 0;
    
    taskContent.quiz.forEach((q: any, i: number) => {
      if (quizAnswers[i] === q.answer) {
        correctCount++;
      }
    });

    const passed = correctCount === taskContent.quiz.length;
    setQuizPassed(passed);

    if (passed && activePlanId && selectedTask && !selectedTask.completed) {
      try {
        // Optimistic update
        const updatedPlans = plans.map(p => {
          if (p._id === activePlanId) {
            const updatedPlan = { ...p };
            const taskIndex = updatedPlan.generatedPlan.findIndex((t: any) => t.id === selectedTask.id);
            if (taskIndex !== -1) {
              updatedPlan.generatedPlan[taskIndex].completed = true;
              const completedCount = updatedPlan.generatedPlan.filter((t: any) => t.completed).length;
              updatedPlan.progress = Math.round((completedCount / updatedPlan.generatedPlan.length) * 100);
            }
            return updatedPlan;
          }
          return p;
        });
        setPlans(updatedPlans);

        await studyPlanAPI.updateTask(activePlanId, selectedTask.id, true);
        setSelectedTask({ ...selectedTask, completed: true });
      } catch (error) {
        console.error('Failed to update task', error);
        fetchPlans(); // Revert on failure
      }
    }
  };

  const handleDelete = (planId: string) => {
    setConfirmModal({ isOpen: true, planId });
  };

  const executeDelete = async () => {
    const planId = confirmModal.planId;
    if (!planId) return;
    try {
      await studyPlanAPI.deletePlan(planId);
      fetchPlans();
      if (activePlanId === planId) setSelectedTask(null);
    } catch (error) {
      console.error('Failed to delete plan', error);
    }
  };

  const getTaskIconColor = (type: string) => {
    switch (type) {
      case 'revision': return 'text-purple-400 bg-purple-400/10 border-purple-400/20 shadow-[0_0_15px_rgba(168,85,247,0.4)]';
      case 'quiz': return 'text-orange-400 bg-orange-400/10 border-orange-400/20 shadow-[0_0_15px_rgba(251,146,60,0.4)]';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20 shadow-[0_0_15px_rgba(96,165,250,0.4)]';
    }
  };

  const getCardBgColor = (type: string, isCompleted: boolean, isActive: boolean, baseClasses: string = '') => {
    if (isActive) return `${baseClasses} bg-primary/10 border-primary shadow-[0_0_30px_rgba(59,130,246,0.2)] scale-105 z-20`;
    if (isCompleted) return `${baseClasses} bg-white/[0.02] border-white/[0.05] opacity-70 hover:opacity-100 hover:bg-white/[0.05]`;
    
    switch (type.toLowerCase()) {
      case 'revision': return `${baseClasses} bg-purple-400/[0.03] border-purple-400/20 hover:bg-purple-400/[0.08] hover:border-purple-400/40 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(168,85,247,0.15)]`;
      case 'quiz': return `${baseClasses} bg-orange-400/[0.03] border-orange-400/20 hover:bg-orange-400/[0.08] hover:border-orange-400/40 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(251,146,60,0.15)]`;
      default: return `${baseClasses} bg-blue-400/[0.03] border-blue-400/20 hover:bg-blue-400/[0.08] hover:border-blue-400/40 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(96,165,250,0.15)]`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex overflow-hidden">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col transition-all duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/[0.06] bg-black/20 flex-shrink-0 z-10 sticky top-0 backdrop-blur-xl">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-4">
              <button
                onClick={() => activePlanId ? setActivePlanId(null) : navigate('/home')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="font-medium text-sm">Back</span>
              </button>
              <div className="w-px h-6 bg-white/[0.1]"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Study Journey Map</h1>
                  <p className="text-xs text-gray-400">Your AI-generated learning path</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-medium transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)]"
            >
              <Plus className="w-4 h-4" />
              New Journey
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-4xl mx-auto">
            
            {/* New Plan Form */}
            {showForm && (
              <div className="mb-12 p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-2xl backdrop-blur-xl animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2 relative z-10">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Generate New Journey Map
                </h2>
                <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Exam Date</label>
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Available Hours / Day</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="16"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Additional Subjects (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. System Design, Algorithms"
                      value={subjects}
                      onChange={(e) => setSubjects(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-400 mb-3">Select Documents to Study</label>
                    {documents.length === 0 ? (
                      <p className="text-gray-500 text-sm">No documents uploaded yet. Upload some in the Dashboard first!</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {documents.map((doc) => {
                          const isSelected = selectedDocs.includes(doc.title);
                          return (
                            <div 
                              key={doc._id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedDocs(prev => prev.filter(t => t !== doc.title));
                                } else {
                                  setSelectedDocs(prev => [...prev, doc.title]);
                                }
                              }}
                              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3
                                ${isSelected ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-black/40 border-white/[0.1] hover:border-white/[0.3]'}
                              `}
                            >
                              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex flex-shrink-0 items-center justify-center
                                ${isSelected ? 'border-primary bg-primary' : 'border-gray-500'}
                              `}>
                                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-white truncate">{doc.title.replace('.pdf', '')}</h4>
                                <p className="text-xs text-gray-400 truncate mt-1">
                                  {doc.quizzes?.length || 0} Quizzes • {doc.flashcardDecks?.length || 0} Flashcards
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={generating || (subjects.trim() === '' && selectedDocs.length === 0)}
                      className="flex items-center gap-2 px-8 py-2.5 bg-white text-black hover:bg-gray-200 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    >
                      {generating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Mapping Journey...
                        </>
                      ) : (
                        <>Generate Journey Map</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {plans.length === 0 && !showForm ? (
              <div className="text-center py-32">
                <div className="w-24 h-24 mx-auto bg-white/[0.02] border border-white/[0.06] rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(255,255,255,0.02)]">
                  <Calendar className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">No journeys mapped</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg">
                  Create an interactive AI learning path. We'll map out everything you need to study, complete with generated content and quizzes.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:-translate-y-1"
                >
                  <Plus className="w-6 h-6" />
                  Map My First Journey
                </button>
              </div>
            ) : activePlanId === null ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in pb-20">
                {plans.map((plan) => {
                  const totalTasks = plan.generatedPlan.length;
                  return (
                    <div key={plan._id} onClick={() => setActivePlanId(plan._id)} className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-primary/50 hover:bg-white/[0.04] transition-all cursor-pointer group flex flex-col h-full shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                         <span className="bg-primary/10 text-primary text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-primary/20">
                           {totalTasks} Milestones
                         </span>
                         <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                           <Calendar className="w-4 h-4" />
                           {new Date(plan.examDate).toLocaleDateString()}
                         </div>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                         {plan.subjects.join(', ')}
                      </h3>
                      <p className="text-sm font-medium text-gray-400 mb-8 flex-1">
                         {plan.availableHoursPerDay} study hours per day
                      </p>

                      <div className="mb-6">
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                          <span>Journey Progress</span>
                          <span className="text-white">{plan.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/[0.05]">
                          <div className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${plan.progress}%` }} />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(plan._id); }} className="w-12 h-12 rounded-xl bg-black/40 hover:bg-red-500/20 text-gray-500 hover:text-red-400 flex items-center justify-center transition-colors border border-white/[0.05] hover:border-red-500/30" title="Delete Journey">
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button className="flex-1 py-3 bg-black/40 group-hover:bg-primary group-hover:text-white text-gray-400 font-bold rounded-xl transition-all border border-white/[0.05] group-hover:border-primary shadow-[0_0_15px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                          View Journey Map
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="animate-fade-in pb-20">
                {(() => {
                  const plan = plans.find(p => p._id === activePlanId);
                  if (!plan) return null;
                  const totalTasks = plan.generatedPlan.length;
                  const completedTasks = plan.generatedPlan.filter((t: any) => t.completed).length;
                  
                  return (
                    <div className="relative">
                      {/* Plan Header */}
                      <div className="sticky top-0 z-20 mb-12 p-6 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/[0.06] shadow-2xl flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                              Target Exam: {new Date(plan.examDate).toLocaleDateString()}
                            </h2>
                            <span className="px-3 py-1 rounded-lg text-xs font-bold tracking-wider uppercase bg-primary/20 text-primary border border-primary/30">
                              {plan.availableHoursPerDay} hrs/day
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {plan.subjects.map((sub: string, i: number) => (
                              <span key={i} className="text-sm font-medium text-gray-400 bg-white/[0.06] px-3 py-1.5 rounded-lg border border-white/[0.05]">
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="text-3xl font-black text-white">{plan.progress}%</div>
                            <div className="text-sm font-medium text-gray-500">{completedTasks} of {totalTasks} milestones reached</div>
                          </div>
                        </div>
                        {/* Progress Bar Line underneath header */}
                        <div className="absolute bottom-0 left-0 h-1 w-full bg-white/[0.05] rounded-b-2xl overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                            style={{ width: `${plan.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Journey Map View */}
                      <div className="relative py-10 px-4 md:px-0">
                        {/* Central Glowing Line */}
                        <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-2 bg-white/[0.03] md:-translate-x-1/2 rounded-full overflow-hidden">
                           <div 
                             className="absolute top-0 left-0 w-full bg-gradient-to-b from-primary via-purple-500 to-transparent transition-all duration-1000"
                             style={{ height: `${plan.progress}%` }}
                           />
                        </div>

                        <div className="space-y-8">
                          {plan.generatedPlan.map((task: any, idx: number) => {
                            const isLeft = idx % 2 === 0;
                            const isCompleted = task.completed;
                            const isActive = selectedTask?.id === task.id;
                            const dateStr = new Date(task.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                            
                            return (
                              <div key={task.id} className="relative flex items-center w-full">
                                
                                {/* Mobile Date Badge */}
                                <div className="md:hidden absolute top-[-24px] left-16 text-xs font-bold text-gray-500 tracking-widest uppercase">
                                  {dateStr}
                                </div>

                                {/* DESKTOP: Left Column (Empty or Card) */}
                                <div className="hidden md:flex w-[45%] justify-end pr-10 relative">
                                  {isLeft && (
                                    <div className="w-full relative group">
                                      {/* Task Card (Left) */}
                                      <div 
                                        onClick={() => handleOpenTask(plan._id, task)}
                                        className={getCardBgColor(task.type, isCompleted, isActive, "relative p-6 rounded-2xl border backdrop-blur-sm transition-all duration-300 cursor-pointer overflow-hidden")}
                                      >
                                        {isActive && <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />}
                                        <div className="flex items-center justify-between mb-4 relative z-10">
                                          <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border ${getTaskIconColor(task.type)}`}>
                                            {task.type === 'study' ? <BookOpen className="w-3.5 h-3.5" /> : task.type === 'revision' ? <Sparkles className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                            {task.type}
                                          </span>
                                          <span className="text-xs font-bold text-gray-500 bg-black/40 px-2 py-1 rounded-md">{task.duration}m</span>
                                        </div>
                                        <h3 className={`text-xl font-bold mb-2 relative z-10 ${isCompleted ? 'text-gray-400' : 'text-white'}`}>{task.title}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium relative z-10">
                                          <div className="w-2 h-2 rounded-full bg-primary/50" />
                                          {task.topic}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {!isLeft && (
                                    <div className="flex items-center justify-end w-full">
                                      <span className="text-sm font-bold text-gray-500">{dateStr}</span>
                                    </div>
                                  )}
                                </div>

                                {/* CENTER: Timeline Node */}
                                <div className="absolute left-8 md:static md:w-[10%] flex justify-center items-center z-10">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleTaskCompletion(plan._id, task);
                                    }}
                                    className={`w-10 h-10 rounded-full border-4 transition-all duration-300 flex items-center justify-center cursor-pointer hover:scale-110 focus:outline-none
                                      ${isCompleted ? 'bg-primary border-black shadow-[0_0_20px_rgba(59,130,246,0.6)]' : 'bg-[#0f0f0f] border-white/[0.3] hover:border-primary/80'}
                                    `}
                                    title={isCompleted ? "Mark as uncompleted" : "Mark as completed"}
                                  >
                                    {isCompleted && <CheckCircle2 className="w-6 h-6 text-black" />}
                                  </button>
                                </div>

                                {/* DESKTOP: Right Column (Card or Empty) & MOBILE: Full Width Card */}
                                <div className="w-full pl-20 md:pl-0 md:w-[45%] flex md:justify-start md:pl-10 relative">
                                  {(!isLeft || window.innerWidth < 768) && (
                                    <div className="w-full relative group">
                                      {/* Task Card (Right or Mobile) */}
                                      <div 
                                        onClick={() => handleOpenTask(plan._id, task)}
                                        className={getCardBgColor(task.type, isCompleted, isActive, "relative p-6 rounded-2xl border backdrop-blur-sm transition-all duration-300 cursor-pointer overflow-hidden w-full")}
                                      >
                                        {isActive && <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />}
                                        <div className="flex items-center justify-between mb-4 relative z-10">
                                          <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border ${getTaskIconColor(task.type)}`}>
                                            {task.type === 'study' ? <BookOpen className="w-3.5 h-3.5" /> : task.type === 'revision' ? <Sparkles className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                            {task.type}
                                          </span>
                                          <span className="text-xs font-bold text-gray-500 bg-black/40 px-2 py-1 rounded-md">{task.duration}m</span>
                                        </div>
                                        <h3 className={`text-xl font-bold mb-2 relative z-10 ${isCompleted ? 'text-gray-400' : 'text-white'}`}>{task.title}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium relative z-10">
                                          <div className="w-2 h-2 rounded-full bg-primary/50" />
                                          {task.topic}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {isLeft && (
                                    <div className="hidden md:flex items-center justify-start w-full">
                                      <span className="text-sm font-bold text-gray-500">{dateStr}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Task Content */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12 animate-fade-in">
          {/* Backdrop overlay */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedTask(null)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-4xl max-h-full bg-[#0a0a0a] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/[0.1] bg-[#0a0a0a] flex items-start gap-4 sticky top-0 z-20">
              <button 
                onClick={() => setSelectedTask(null)}
                className="mt-1 p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white transition-colors flex-shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 pr-4">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border mb-3 ${getTaskIconColor(selectedTask.type)}`}>
                  {selectedTask.type}
                </span>
                <h2 className="text-2xl font-bold text-white leading-tight mb-2">{selectedTask.title}</h2>
                <div className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {selectedTask.topic}
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              {loadingContent ? (
                <div className="p-10 flex flex-col items-center justify-center h-[50vh] text-center">
                  <div className="w-20 h-20 relative mb-8">
                    <div className="absolute inset-0 rounded-full border-4 border-white/[0.05]" />
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Generating Study Material</h3>
                  <p className="text-gray-500 text-sm max-w-[250px]">
                    AI is analyzing your documents and crafting a personalized study guide and quiz...
                  </p>
                </div>
              ) : taskContent ? (
                <div className="p-8">
                  
                  {/* Study Guide Content */}
                  <div className="prose prose-invert prose-blue max-w-none mb-12 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-a:text-primary prose-pre:bg-[#111] prose-pre:border prose-pre:border-white/[0.1]">
                    <ReactMarkdown>{taskContent.studyGuide}</ReactMarkdown>
                  </div>

                  <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.1] to-transparent my-12" />

                  {/* Mini Quiz Section */}
                  <div className="bg-[#111] border border-white/[0.1] rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />
                    
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Knowledge Check</h3>
                        <p className="text-sm text-gray-400">Test your understanding (Optional)</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {taskContent.quiz.map((q: any, i: number) => (
                        <div key={i} className="space-y-4">
                          <h4 className="text-base font-bold text-white">
                            <span className="text-primary mr-2">{i + 1}.</span>
                            {q.question}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((opt: string, j: number) => {
                              const isSelected = quizAnswers[i] === opt;
                              const isCorrect = q.answer === opt;
                              const showCorrect = quizSubmitted && isCorrect;
                              const showWrong = quizSubmitted && isSelected && !isCorrect;

                              return (
                                <button
                                  key={j}
                                  disabled={quizSubmitted || selectedTask.completed}
                                  onClick={() => setQuizAnswers(prev => ({ ...prev, [i]: opt }))}
                                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all font-medium text-sm
                                    ${showCorrect ? 'bg-green-500/20 border-green-500/50 text-green-100 shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 
                                      showWrong ? 'bg-red-500/20 border-red-500/50 text-red-100' :
                                      isSelected ? 'bg-primary/20 border-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 
                                      'bg-white/[0.02] border-white/[0.08] text-gray-400 hover:bg-white/[0.06] hover:text-white'}
                                  `}
                                >
                                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center
                                    ${showCorrect ? 'border-green-500 bg-green-500' : 
                                      showWrong ? 'border-red-500 bg-red-500' :
                                      isSelected ? 'border-primary bg-primary' : 'border-gray-600'}
                                  `}>
                                    {showCorrect && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    {showWrong && <X className="w-3 h-3 text-white" />}
                                  </div>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          
                          {quizSubmitted && (
                            <div className={`p-4 rounded-xl text-sm font-medium border ${quizAnswers[i] === q.answer ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                              <span className="font-bold mb-1 block">Explanation:</span>
                              {q.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {!selectedTask.completed && (
                      <div className="mt-10 pt-8 border-t border-white/[0.1] flex flex-col gap-4">
                        {!quizSubmitted && Object.keys(quizAnswers).length === taskContent.quiz.length && (
                          <button
                            onClick={handleQuizSubmit}
                            className="w-full py-3 bg-white/[0.05] hover:bg-white/[0.1] text-white rounded-xl font-bold text-sm transition-all"
                          >
                            Check Quiz Answers
                          </button>
                        )}
                        
                        <button
                          onClick={async () => {
                            if (activePlanId) {
                              await handleToggleTaskCompletion(activePlanId, selectedTask);
                              setSelectedTask(null);
                            }
                          }}
                          className="w-full py-4 bg-primary hover:bg-primary-light text-white rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                        >
                          Mark as Complete & Close
                        </button>
                      </div>
                    )}
                    
                    {selectedTask.completed && (
                       <div className="mt-10 space-y-4">
                         <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 font-bold text-center flex justify-center items-center gap-3 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                            <CheckCircle2 className="w-6 h-6" />
                            Milestone Unlocked & Completed
                         </div>
                         <button
                           onClick={() => setSelectedTask(null)}
                           className="w-full py-4 bg-white/[0.05] hover:bg-white/[0.1] text-white rounded-xl font-bold text-lg transition-all"
                         >
                           Close Window
                         </button>
                       </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-10 text-center text-gray-500">
                  <AlertCircle className="w-10 h-10 mx-auto mb-4 opacity-50" />
                  <p>Failed to load content. Please try again.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Delete Study Plan"
        message="Are you sure you want to delete this study plan? This action cannot be undone and will delete all generated content associated with it."
        onConfirm={executeDelete}
        onCancel={() => setConfirmModal({ isOpen: false, planId: null })}
      />
    </div>
  );
};

export default StudyPlanner;
