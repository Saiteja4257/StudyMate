import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studySpaceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  LayoutGrid,
  Brain,
  Layers,
  MessageSquare,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MonitorPlay,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';

type TabKey = 'modules' | 'notes' | 'quiz' | 'flashcards' | 'chat' | 'visual';

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'modules', label: 'Modules', icon: LayoutGrid },
  { key: 'notes', label: 'Study Notes', icon: BookOpen },
  { key: 'flashcards', label: 'Flashcards', icon: Layers },
  { key: 'quiz', label: 'Practice Quiz', icon: Brain },
  { key: 'visual', label: 'Visual', icon: MonitorPlay },
  { key: 'chat', label: 'AI Tutor', icon: MessageSquare },
];
import ModuleDetail from '../components/studyspace/ModuleDetail';
import ExportPDFButton from '../components/studyspace/ExportPDFButton.tsx';
import { ArrowLeft, Sparkles } from 'lucide-react';

const StudySpaceDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [space, setSpace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('modules');

  useEffect(() => {
    fetchSpace();
  }, [id]);

  const fetchSpace = async () => {
    try {
      const res = await studySpaceAPI.getById(id!);
      setSpace(res.data);
      if (res.data.modules.length > 0) {
        setActiveModuleId(res.data.modules[0]._id);
      }
    } catch (error) {
      console.error('Failed to fetch space', error);
      navigate('/study-spaces');
    } finally {
      setLoading(false);
    }
  };

  const activeModuleIndex = space?.modules.findIndex((m: any) => m._id === activeModuleId) ?? -1;
  const activeModule = activeModuleIndex !== -1 ? space?.modules[activeModuleIndex] : null;

  const handleNext = () => {
    if (activeModuleIndex < space.modules.length - 1) {
      setActiveModuleId(space.modules[activeModuleIndex + 1]._id);
    }
  };

  const handlePrev = () => {
    if (activeModuleIndex > 0) {
      setActiveModuleId(space.modules[activeModuleIndex - 1]._id);
    }
  };

  const handleModuleProgressUpdate = async (moduleId: string, completed: boolean) => {
    try {
      const res = await studySpaceAPI.updateModuleProgress(id!, moduleId, completed);
      setSpace(res.data);
    } catch (error) {
      console.error("Failed to update module progress:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!space) return null;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-8 pt-6 pb-0 shrink-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-3 mr-4">
            <button
              onClick={() => navigate('/study-spaces')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium text-sm">Back</span>
            </button>

            <button
              onClick={() => navigate('/study-spaces')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-indigo-400 hover:bg-indigo-400/10 transition-all font-medium text-sm border border-transparent hover:border-indigo-400/20"
            >
              <span className="text-lg leading-none mb-0.5">+</span>
              New space
            </button>

            <div className="w-px h-6 bg-white/[0.1] mx-2"></div>
          </div>

          <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 uppercase tracking-wider">
                {space.topic}
              </span>
              <h1 className="text-xl font-bold text-white line-clamp-1">{space.title}</h1>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Created {new Date(space.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              <div className="flex items-center gap-2 w-32">
                <span>{space.progress}%</span>
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${space.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <ExportPDFButton space={space} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/[0.06] -mx-8 px-8">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-[1px] ${
                  isActive
                    ? 'text-white border-indigo-500'
                    : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-white/[0.1]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
        {activeTab === 'modules' ? (
          <div className="max-w-5xl mx-auto animate-fade-in">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Course Modules</h2>
                <p className="text-gray-400">Select a module to start learning and view its study materials.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {space.modules.map((m: any, idx: number) => (
                <div
                  key={m._id}
                  onClick={() => {
                    setActiveModuleId(m._id);
                    setActiveTab('notes');
                  }}
                  className={`group relative p-5 rounded-2xl cursor-pointer transition-all duration-300 border ${
                    activeModuleId === m._id 
                      ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]' 
                      : 'bg-[#151515] border-white/[0.05] hover:border-white/[0.1] hover:-translate-y-0.5 hover:shadow-xl hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-xs font-bold px-2 py-1 bg-white/[0.05] text-gray-400 rounded-md">
                      Module {idx + 1}
                    </span>
                    {m.completed ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-white/[0.05] px-2 py-1 rounded-md group-hover:text-indigo-300 transition-colors">
                        <Circle className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                  </div>
                  <h3 className={`text-lg font-bold mb-2 line-clamp-2 ${activeModuleId === m._id ? 'text-indigo-100' : 'text-white'}`}>
                    {m.title}
                  </h3>
                  {m.summary && (
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                      {m.summary}
                    </p>
                  )}
                  
                  {activeModuleId === m._id && (
                    <div className="absolute inset-0 border-2 border-indigo-500/50 rounded-2xl pointer-events-none" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto pb-20">
            {activeModule && (
              <ModuleDetail 
                spaceId={id!} 
                module={activeModule} 
                onProgressUpdate={handleModuleProgressUpdate}
                activeTab={activeTab as any}
              />
            )}
          </div>
        )}
      </div>
      
      {/* Footer Navigation (only show if not on modules list) */}
      {activeTab !== 'modules' && (
        <div className="absolute bottom-0 w-full bg-[#0a0a0a] border-t border-white/[0.06] p-4 flex items-center justify-between z-10">
          <button
            onClick={handlePrev}
            disabled={activeModuleIndex <= 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Previous Module
          </button>
          
          <span className="text-sm text-gray-500 font-medium">
            Module {activeModuleIndex + 1} of {space.modules.length}
          </span>
          
          <button
            onClick={handleNext}
            disabled={activeModuleIndex >= space.modules.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next Module <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default StudySpaceDashboard;
