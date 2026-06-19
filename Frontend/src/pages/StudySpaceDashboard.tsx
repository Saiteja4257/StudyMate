import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studySpaceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import ModuleDetail from '../components/studyspace/ModuleDetail';
import StudySpaceTutor from '../components/studyspace/StudySpaceTutor';
import ExportPDFButton from '../components/studyspace/ExportPDFButton';

const StudySpaceDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [space, setSpace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden text-white">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar / Roadmap */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#111] border-r border-white/[0.06] flex flex-col transition-transform duration-300 md:relative md:translate-x-0 \${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <button 
            onClick={() => navigate('/study-spaces')}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300">
              {space.topic}
            </span>
          </div>
          <h2 className="text-lg font-bold leading-tight mb-3">{space.title}</h2>
          
          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Progress</span>
              <span>{space.progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `\${space.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modules List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {space.modules.map((m: any, idx: number) => (
            <button
              key={m._id}
              onClick={() => {
                setActiveModuleId(m._id);
                setSidebarOpen(false);
              }}
              className={`w-full text-left p-3 rounded-xl transition-all flex gap-3 \${
                activeModuleId === m._id 
                  ? 'bg-indigo-500/10 border border-indigo-500/30' 
                  : 'hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <div className="mt-0.5">
                {m.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className={`w-5 h-5 \${activeModuleId === m._id ? 'text-indigo-400' : 'text-gray-600'}`} />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5 font-medium">Module {idx + 1}</p>
                <p className={`text-sm font-medium line-clamp-2 \${activeModuleId === m._id ? 'text-indigo-300' : 'text-gray-300'}`}>
                  {m.title}
                </p>
              </div>
            </button>
          ))}
        </div>
        
        {/* Export Button */}
        <div className="p-4 border-t border-white/[0.06]">
          <ExportPDFButton space={space} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0a0a]">
        {/* Top bar for mobile / Header */}
        <header className="h-16 border-b border-white/[0.06] flex items-center justify-between px-4 sm:px-6 shrink-0 bg-[#0a0a0a]/80 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-white truncate max-w-[200px] sm:max-w-md hidden sm:block">
              {activeModule?.title}
            </h1>
          </div>
          
        </header>

        {/* Module Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div className="max-w-4xl mx-auto py-8 px-4 sm:px-8 pb-32">
            {activeModule && (
              <ModuleDetail 
                spaceId={id!} 
                module={activeModule} 
                onProgressUpdate={handleModuleProgressUpdate}
              />
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="absolute bottom-0 w-full bg-[#111] border-t border-white/[0.06] p-4 flex items-center justify-between z-10">
          <button
            onClick={handlePrev}
            disabled={activeModuleIndex <= 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Previous Module
          </button>
          
          <button
            onClick={handleNext}
            disabled={activeModuleIndex >= space.modules.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next Module <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default StudySpaceDashboard;
