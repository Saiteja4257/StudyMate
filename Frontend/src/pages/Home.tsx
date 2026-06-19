import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { documentAPI } from '../services/api';
import {
  Plus,
  FileText,
  Trash2,
  MoreVertical,
  Loader2,
  Sparkles,
  Settings,
  LogOut,
  BookOpen,
  Globe,
  Brain,
  Layers,
  Zap,
  Upload,
  ArrowRight,
  ChevronDown,
  MessageSquare,
  CheckCircle2,
  Shield,
} from 'lucide-react';

interface DocItem {
  _id: string;
  title: string;
  createdAt: string;
  summary?: string;
  quiz?: any[];
  flashcards?: any[];
}

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spacesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await documentAPI.getAll();
      setDocuments(res.data);
    } catch (error) {
      console.error('Failed to fetch documents', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const res = await documentAPI.upload(formData);
      if (res.data.documentId) {
        navigate(`/space/${res.data.documentId}`);
      } else {
        fetchDocuments();
      }
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setDeletingId(id);
    try {
      await documentAPI.delete(id);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
    } catch (error) {
      console.error('Delete failed', error);
    } finally {
      setDeletingId(null);
    }
  };

  const getSourceCount = (doc: DocItem) => {
    let count = 0;
    if (doc.summary) count++;
    if (doc.quiz && doc.quiz.length > 0) count++;
    if (doc.flashcards && doc.flashcards.length > 0) count++;
    return count;
  };

  const scrollToSpaces = () => {
    spacesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const cardColors = [
    '#2a3a2a', '#2a2a3a', '#3a2a2a', '#2a3a3a', '#3a3a2a', '#332a3a',
  ];

  const cardIcons = [Globe, BookOpen, FileText, Sparkles];

  const features = [
    {
      icon: Upload,
      title: 'Upload Your Material',
      description: 'Drop any PDF — lecture notes, textbooks, research papers, or syllabi. Our AI reads and understands your content in seconds.',
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Summaries',
      description: 'Get concise, structured study notes automatically. Key concepts are highlighted and organized for quick review before exams.',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: Brain,
      title: 'Smart Quizzes',
      description: 'Test your understanding with auto-generated multiple choice questions. Instant feedback helps you identify knowledge gaps.',
      color: 'text-secondary',
      bg: 'bg-secondary/10',
    },
    {
      icon: Layers,
      title: 'Flashcard Decks',
      description: 'Interactive flip cards for active recall study sessions. The most effective memorization technique, powered by AI.',
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
    },
  ];

  const steps = [
    { num: '01', title: 'Upload', desc: 'Drop your PDF into a new study space' },
    { num: '02', title: 'Generate', desc: 'AI analyzes and creates study materials' },
    { num: '03', title: 'Study', desc: 'Review summaries, take quizzes, flip cards' },
    { num: '04', title: 'Master', desc: 'Ace your exams with deep understanding' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleUpload}
      />

      {/* ─── Top Navigation ─── */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/70 backdrop-blur-2xl border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 flex-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-lg font-bold text-white tracking-tight">StudyMate</span>
          </div>

          <div className="hidden sm:flex items-center justify-center gap-8 flex-1">
            <button
              onClick={scrollToSpaces}
              className="text-lg font-medium text-gray-400 hover:text-white transition-colors"
            >
              My Spaces
            </button>
            <button
              onClick={() => navigate('/study-planner')}
              className="text-lg font-medium text-gray-400 hover:text-white transition-colors"
            >
              Study Planner
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="text-lg font-medium text-gray-400 hover:text-white transition-colors"
            >
              Analytics
            </button>
          </div>

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
                  onClick={() => navigate('/profile')}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  My Profile
                </button>
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

      {/* ─── Hero Section ─── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-secondary/6 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-gray-400 mb-8 animate-fade-in">
            <Zap className="w-3.5 h-3.5 text-primary" />
            AI-Powered Study Platform
          </div>

          {/* Main Title */}
          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight mb-6 animate-slide-up">
            <span className="text-white">Study</span>
            <span className="gradient-text">Mate</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Upload your study material and let AI transform it into
            <span className="text-white font-medium"> summaries</span>,
            <span className="text-white font-medium"> quizzes</span>, and
            <span className="text-white font-medium"> flashcards</span> — instantly.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="btn-primary flex items-center gap-2 px-8 py-4 text-lg rounded-2xl"
            >
              {isUploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</>
              ) : (
                <><Plus className="w-5 h-5" /> Create Study Space</>
              )}
            </button>
            <button
              onClick={scrollToSpaces}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-lg"
            >
              View my spaces
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Scroll indicator */}
          <div className="animate-bounce">
            <ChevronDown className="w-6 h-6 text-gray-600 mx-auto" />
          </div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Everything you need to
              <span className="gradient-text"> ace your exams</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              From raw PDFs to exam-ready knowledge — StudyMate handles it all with AI that actually understands your content.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="group relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 hover:border-white/[0.12] transition-all duration-500 overflow-hidden"
              >
                {/* Hover glow */}
                <div className={`absolute -top-20 -right-20 w-40 h-40 ${feature.bg} rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-24 px-6 relative border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              How it <span className="gradient-text">works</span>
            </h2>
            <p className="text-lg text-gray-500">Four simple steps to transform your study game.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => (
              <div key={idx} className="text-center group">
                <div className="text-5xl font-black text-white/[0.04] group-hover:text-primary/20 transition-colors duration-500 mb-4">
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Trust / Benefits Section ─── */}
      <section className="py-24 px-6 relative border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Instant Generation</h3>
              <p className="text-sm text-gray-500">AI generates study materials in seconds, not hours. More time studying, less time preparing.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Your Data, Secured</h3>
              <p className="text-sm text-gray-500">Your documents are private and encrypted. We never share your study materials with anyone.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">AI Chat</h3>
              <p className="text-sm text-gray-500">Ask questions about your documents and get instant, context-aware answers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Your Study Spaces Section ─── */}
      <section ref={spacesRef} className="py-24 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">Your Study Spaces</h2>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary-light transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              New space
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {/* Create New Space Card */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="group relative bg-white/[0.02] border-2 border-dashed border-white/[0.06] hover:border-primary/30 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px] transition-all duration-300 hover:bg-white/[0.03]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                    <span className="text-sm text-gray-400">Uploading...</span>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-white/[0.04] group-hover:bg-primary/15 flex items-center justify-center mb-4 transition-colors duration-300">
                      <Plus className="w-7 h-7 text-gray-500 group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                      Create new space
                    </span>
                  </>
                )}
              </button>

              {/* Document Cards */}
              {documents.map((doc, idx) => {
                const IconComp = cardIcons[idx % cardIcons.length];
                const bgColor = cardColors[idx % cardColors.length];
                const sources = getSourceCount(doc);

                return (
                  <div
                    key={doc._id}
                    onClick={() => navigate(`/space/${doc._id}`)}
                    className="group relative cursor-pointer rounded-2xl overflow-hidden min-h-[220px] flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40"
                    style={{ background: `linear-gradient(160deg, ${bgColor}, #141414)` }}
                  >
                    <div className="flex-1 p-5 flex flex-col">
                      {/* Icon + Menu */}
                      <div className="flex items-start justify-between mb-auto">
                        <div className="w-11 h-11 rounded-xl bg-white/[0.08] flex items-center justify-center">
                          <IconComp className="w-5 h-5 text-blue-400" />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === doc._id ? null : doc._id);
                          }}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/[0.1] transition-all"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {menuOpenId === doc._id && (
                          <div className="absolute top-14 right-3 w-36 py-1 bg-[#222] border border-white/[0.1] rounded-xl shadow-2xl z-20">
                            <button
                              onClick={(e) => handleDelete(doc._id, e)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              {deletingId === doc._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              Delete
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Title + Meta */}
                      <div className="mt-8">
                        <h3 className="text-base font-semibold text-white line-clamp-2 mb-2.5 leading-snug">
                          {doc.title.replace('.pdf', '')}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {new Date(doc.createdAt).toLocaleDateString('en-US', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                          {' · '}
                          {sources > 0 ? `${sources}/3 generated` : '1 source'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!loading && documents.length === 0 && (
            <div className="text-center py-12 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
                <BookOpen className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No study spaces yet</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                Upload your first PDF to create a study space and unlock AI-powered learning.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-8 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-gray-500">StudyMate AI</span>
          </div>
          <p className="text-xs text-gray-600">Your data is private and never used for training.</p>
        </div>
      </footer>

      {/* Click outside to close menus */}
      {menuOpenId && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
      )}
    </div>
  );
};

export default Home;
