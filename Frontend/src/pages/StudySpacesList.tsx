import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { studySpaceAPI } from '../services/api';
import CreateStudySpaceModal from '../components/CreateStudySpaceModal';
import StudySpaceCreate from './StudySpaceCreate';
import {
  Plus,
  BookOpen,
  Trash2,
  MoreVertical,
  Loader2,
  Sparkles,
  ArrowRight,
  Settings,
  LogOut,
  Layers,
  GraduationCap,
  ArrowLeft
} from 'lucide-react';

interface StudySpaceItem {
  _id: string;
  title: string;
  topic: string;
  progress: number;
  createdAt: string;
}

const StudySpacesList = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [spaces, setSpaces] = useState<StudySpaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    try {
      const res = await studySpaceAPI.getAll();
      setSpaces(res.data);
    } catch (error) {
      console.error('Failed to fetch study spaces', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setDeletingId(id);
    try {
      await studySpaceAPI.delete(id);
      setSpaces((prev) => prev.filter((s) => s._id !== id));
    } catch (error) {
      console.error('Delete failed', error);
    } finally {
      setDeletingId(null);
    }
  };

  const cardColors = ['#1a2a3a', '#2a1a3a', '#3a2a1a', '#1a3a2a'];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* ─── Top Navigation ─── */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/70 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium text-sm">Back</span>
            </button>
          </div>
          {/* <div className="flex items-center gap-2.5 flex-1 cursor-pointer" onClick={() => navigate('/home')}>
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-lg font-bold text-white tracking-tight">StudyMate</span>
          </div> */}

          

          <div className="flex items-center justify-end gap-5 flex-1">
            <div className="relative group">
              <button className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold ring-2 ring-transparent hover:ring-primary/30 transition-all">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </button>
              <div className="absolute right-0 top-full mt-2 w-52 py-2 bg-[#1a1a1a] border border-white/[0.08] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── Content ─── */}
      <main className="pt-32 pb-24 px-6 max-w-6xl mx-auto min-h-screen">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">AI Study Spaces</h1>
            <p className="text-gray-400">Your personalized, AI-generated courses.</p>
          </div>
          <button
            onClick={() => navigate("/study-spaces/create") }
            className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl font-medium"
          >
            <Plus className="w-5 h-5" /> Create Study Space
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : spaces.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.02] border border-white/[0.06] rounded-3xl animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">No AI Courses Yet</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
              Generate a complete course on any topic in seconds.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white flex items-center gap-2 px-6 py-3 rounded-xl font-medium mx-auto transition-all"
            >
              <Plus className="w-5 h-5" /> Create Study Space
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spaces.map((space, idx) => {
              const bgColor = cardColors[idx % cardColors.length];
              return (
                <div
                  key={space._id}
                  onClick={() => navigate(`/study-spaces/${space._id}`)}
                  className="group relative cursor-pointer rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40 border border-white/[0.05] hover:border-white/[0.15]"
                  style={{ background: `linear-gradient(160deg, ${bgColor}, #111)` }}
                >
                  <div className="flex-1 p-6 flex flex-col relative z-10">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.08] flex items-center justify-center">
                        <Layers className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === space._id ? null : space._id);
                          }}
                          className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/[0.1] transition-all"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {menuOpenId === space._id && (
                          <div className="absolute top-10 right-0 w-36 py-1 bg-[#222] border border-white/[0.1] rounded-xl shadow-2xl z-20">
                            <button
                              onClick={(e) => handleDelete(space._id, e)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              {deletingId === space._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 truncate">
                          {space.topic}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-4 line-clamp-2 leading-snug">
                        {space.title}
                      </h3>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white font-medium">{space.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${space.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {menuOpenId && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
      )}

      <CreateStudySpaceModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSelectPDF={() => navigate('/home')}
        onSelectAI={() => navigate('/study-spaces/create')}
      />
    </div>
  );
};

export default StudySpacesList;
