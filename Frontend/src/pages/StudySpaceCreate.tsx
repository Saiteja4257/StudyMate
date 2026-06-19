import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { studySpaceAPI } from '../services/api';
import { ArrowLeft, Sparkles, Loader2, Target, Zap, Layout } from 'lucide-react';

const StudySpaceCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    topic: '',
    goal: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic || !formData.goal) return;

    setLoading(true);
    try {
      const res = await studySpaceAPI.generate(formData);
      navigate(`/study-spaces/${res.data._id}`);
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate study space. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-2xl w-full relative z-10">
        <button
          onClick={() => navigate('/study-spaces')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to spaces
        </button>

        <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-8 sm:p-12 backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
              Generate AI Course
            </h1>
            <p className="text-gray-400">
              Tell us what you want to learn, and we'll create a complete curriculum for you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Layout className="w-4 h-4 text-indigo-400" />
                Topic
              </label>
              <input
                type="text"
                required
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g. Data Structures, Machine Learning, World War 2"
                className="w-full bg-[#111] border border-white/[0.1] rounded-xl px-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                disabled={loading}
              />
            </div>


            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Target className="w-4 h-4 text-indigo-400" />
                Learning Goal
              </label>
              <input
                type="text"
                required
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                placeholder="e.g. Semester Exam Preparation, Job Interview, Just for fun"
                className="w-full bg-[#111] border border-white/[0.1] rounded-xl px-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !formData.topic || !formData.goal}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-4 rounded-xl mt-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Designing your course...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Study Space
                </>
              )}
            </button>
          </form>

          {loading && (
            <p className="text-center text-sm text-gray-500 mt-4 animate-pulse">
              This usually takes 10-15 seconds. We are building your custom curriculum!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudySpaceCreate;
