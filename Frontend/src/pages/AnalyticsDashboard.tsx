import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { ChevronLeft, TrendingUp, BookOpen, BrainCircuit, Target, CheckCircle2, AlertTriangle, ArrowRight, Lightbulb, Sparkles } from 'lucide-react';
import { analyticsAPI, type AnalyticsSummary } from '../services/analyticsService';

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await analyticsAPI.getDashboard();
      if (res.data && res.data.data) {
        setData(res.data.data);
      } else {
        // Fallback for previous implementation structure
        setData(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Format topic performance for charts
  const topicData = Object.entries(data.topicPerformance || {}).map(([name, score]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    score
  })).sort((a, b) => b.score - a.score).slice(0, 8); // Top 8 topics

  const progressData = [
    { name: 'Completed', value: data.studyProgress?.completedTasks || 0 },
    { name: 'Remaining', value: data.studyProgress?.remainingTasks || 0 },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="px-8 py-6 border-b border-white/[0.06] bg-black/40 sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/home')}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-primary/30">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Learning Analytics
            </h1>
            <p className="text-sm text-gray-500 font-medium">Track your learning journey</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.05] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <BookOpen className="w-16 h-16" />
            </div>
            <div className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Documents</div>
            <div className="text-4xl font-black text-white">{data.totalDocumentsUploaded}</div>
          </div>
          
          <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.05] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target className="w-16 h-16" />
            </div>
            <div className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Quiz Attempts</div>
            <div className="text-4xl font-black text-white">{data.totalQuizAttempts}</div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.05] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <BrainCircuit className="w-16 h-16" />
            </div>
            <div className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Avg Score</div>
            <div className="text-4xl font-black text-white">{data.averageQuizScore}%</div>
            <div className="mt-2 text-xs font-medium text-gray-500">Based on {data.totalQuestionsAsked} questions</div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.05] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CheckCircle2 className="w-16 h-16 text-primary" />
            </div>
            <div className="text-sm font-bold text-primary mb-2 uppercase tracking-wider">Plan Progress</div>
            <div className="text-4xl font-black text-white">{data.studyPlanCompletionPercentage}%</div>
            <div className="w-full h-1.5 bg-white/[0.05] rounded-full mt-3 overflow-hidden">
               <div className="h-full bg-primary" style={{ width: `${data.studyPlanCompletionPercentage}%` }}></div>
            </div>
          </div>
        </div>

        {/* AI Learning Insights */}
        <div className="p-6 md:p-8 rounded-3xl bg-primary/10 border border-primary/20 shadow-[0_0_40px_rgba(59,130,246,0.1)] flex flex-col md:flex-row gap-6 items-start">
          <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Learning Insights</h3>
            <div className="space-y-3">
              {data.weakTopics && data.weakTopics.length > 0 && (
                <p className="text-blue-100 flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 mt-1 text-primary" />
                  <span><strong>{data.weakTopics[0]}</strong> is currently your weakest topic. We recommend reviewing this document and mapping out a new study journey specifically for it.</span>
                </p>
              )}
              {data.strongTopics && data.strongTopics.length > 0 && (
                <p className="text-blue-100 flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 mt-1 text-primary" />
                  <span>Great job on <strong>{data.strongTopics[0]}</strong>! Your high quiz scores indicate strong mastery. Focus on maintaining this retention.</span>
                </p>
              )}
              <p className="text-blue-100 flex items-start gap-2">
                <ArrowRight className="w-4 h-4 mt-1 text-primary" />
                <span>You have a study plan completion rate of <strong>{data.studyPlanCompletionPercentage}%</strong>. Consistency is key to long-term memory retention!</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05]">
              <h3 className="text-lg font-bold mb-6">Topic Mastery Scores</h3>
              <div className="h-[300px] w-full">
                {topicData.length > 0 ? (
                  <ResponsiveContainer width="99%" height="100%">
                    <BarChart data={topicData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40}>
                        {topicData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.score < 60 ? '#ef4444' : entry.score < 80 ? '#f59e0b' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <Target className="w-12 h-12 mb-3 opacity-20" />
                    <p>Take more quizzes to see your topic mastery.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05]">
              <h3 className="text-lg font-bold mb-6">Activity Trend</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="99%" height="100%">
                  <AreaChart data={data.monthlyActivity || []}>
                    <defs>
                      <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis stroke="#6b7280" tick={{ fill: '#6b7280' }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="activity" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorActivity)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Progress Doughnut */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center">
              <h3 className="text-lg font-bold w-full text-left mb-4">Journey Progress</h3>
              <div className="h-[220px] w-full relative">
                {data.studyProgress?.totalTasks > 0 ? (
                  <>
                    <ResponsiveContainer width="99%" height="100%">
                      <PieChart>
                        <Pie
                          data={progressData}
                          innerRadius={70}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="rgba(255,255,255,0.05)" />
                        </Pie>
                        <RechartsTooltip contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black">{data.studyPlanCompletionPercentage}%</span>
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Completed</span>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-500">
                    <p>No study plans mapped yet.</p>
                  </div>
                )}
              </div>
              <div className="flex w-full justify-between mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{data.studyProgress?.completedTasks || 0}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Tasks Done</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-400">{data.studyProgress?.remainingTasks || 0}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-bold">Remaining</div>
                </div>
              </div>
            </div>

            {/* Topic Strengths/Weaknesses Lists */}
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05]">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Areas to Improve
              </h3>
              {data.weakTopics && data.weakTopics.length > 0 ? (
                <div className="space-y-3">
                  {data.weakTopics.map((topic, i) => (
                    <div key={i} className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-sm font-medium text-red-200">{topic}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">No weak topics identified yet. Take more quizzes!</div>
              )}
            </div>

            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.05]">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Strong Topics
              </h3>
              {data.strongTopics && data.strongTopics.length > 0 ? (
                <div className="space-y-3">
                  {data.strongTopics.map((topic, i) => (
                    <div key={i} className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 px-4 py-3 rounded-xl">
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="text-sm font-medium text-yellow-200">{topic}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">Score above 80% on quizzes to identify strong topics!</div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
