import React, { useEffect, useState } from 'react';
import { analyticsAPI } from '../../services/api';
import {
  Loader2,
  FileText,
  Brain,
  Layers,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface InsightsTabProps {
  documentId: string;
}

interface AnalyticsData {
  stats: {
    totalDocuments: number;
    totalSummaries: number;
    totalQuizzes: number;
    totalFlashcards: number;
  };
  weakTopics?: { name: string; count: number }[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'];

const InsightsTab: React.FC<InsightsTabProps> = ({ documentId }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [documentId]);

  const fetchAnalytics = async () => {
    try {
      const res = await analyticsAPI.getAnalytics(documentId);
      setData(res.data);
    } catch (error) {
      console.error('Failed to fetch document analytics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
      </div>
    );
  }

  const { stats, weakTopics = [] } = data;

  const pieData = [
    { name: 'Summaries', value: stats.totalSummaries },
    { name: 'Quizzes', value: stats.totalQuizzes },
    { name: 'Flashcards', value: stats.totalFlashcards },
  ].filter(item => item.value > 0);

  const hasData = pieData.length > 0;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <TrendingUp className="w-6 h-6 text-secondary" />
        <h2 className="text-2xl font-bold text-white">Document Insights</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1 */}
        <div className="group relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all overflow-hidden">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-primary/10">
              <FileCheck className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1 relative z-10">Summaries Generated</h3>
          <p className="text-4xl font-black text-white relative z-10">{stats.totalSummaries}</p>
        </div>

        {/* Card 2 */}
        <div className="group relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all overflow-hidden">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-secondary/10">
              <Brain className="w-6 h-6 text-secondary" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1 relative z-10">Quizzes Taken</h3>
          <p className="text-4xl font-black text-white relative z-10">{stats.totalQuizzes}</p>
        </div>

        {/* Card 3 */}
        <div className="group relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all overflow-hidden">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 rounded-xl bg-amber-500/10">
              <Layers className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm font-medium mb-1 relative z-10">Flashcard Decks</h3>
          <p className="text-4xl font-black text-white relative z-10">{stats.totalFlashcards}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weak Topics */}
        <div className="bg-gradient-to-br from-secondary/10 to-primary/5 border border-secondary/20 rounded-2xl p-8 h-[350px] flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Brain className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-bold text-white">Focus Areas</h3>
          </div>
          
          {weakTopics.length > 0 ? (
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
              {weakTopics.map((topic, idx) => (
                <div key={idx} className="bg-[#111] border border-white/[0.08] px-4 py-3 rounded-xl flex items-center justify-between group hover:border-secondary/50 transition-colors">
                  <span className="text-gray-300 font-medium">{topic.name}</span>
                  <span className="w-6 h-6 rounded-full bg-white/[0.05] text-xs flex items-center justify-center text-gray-500 group-hover:bg-secondary/20 group-hover:text-secondary transition-colors">
                    {topic.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-center">
              <Brain className="w-10 h-10 mb-3 opacity-20" />
              <p>Take some quizzes to get<br/>AI-powered topic analysis</p>
            </div>
          )}
        </div>

        {/* Content Distribution */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 h-[350px] flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6">Content Distribution</h3>
          <div className="flex-1 relative">
            {hasData ? (
               <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={pieData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={90}
                   paddingAngle={5}
                   dataKey="value"
                   stroke="none"
                 >
                   {pieData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip 
                   contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                   itemStyle={{ color: '#fff' }}
                 />
               </PieChart>
             </ResponsiveContainer>
            ) : (
               <div className="flex items-center justify-center h-full text-gray-500 text-center">
                 <p>Generate summaries, quizzes, or flashcards<br/>to see distribution</p>
               </div>
            )}
          </div>
          {/* Custom Legend */}
          {hasData && (
            <div className="flex justify-center gap-4 mt-4">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm text-gray-400">{entry.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightsTab;
