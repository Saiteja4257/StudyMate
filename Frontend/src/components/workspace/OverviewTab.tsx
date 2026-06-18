import React from 'react';
import {
  FileText,
  Calendar,
  Sparkles,
  Brain,
  Layers,
  Network,
  CheckCircle2,
  Circle,
  ArrowRight,
} from 'lucide-react';

interface OverviewTabProps {
  document: any;
  onNavigateTab: (tab: string) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ document, onNavigateTab }) => {
  const hasSummary = !!document.summary;
  const hasQuiz = document.quiz && document.quiz.length > 0;
  const hasFlashcards = document.flashcards && document.flashcards.length > 0;
  const hasMindMap = !!document.mindMap;

  const features = [
    {
      title: 'AI Summary',
      description: 'Get a comprehensive summary of your document, distilled into key study points.',
      icon: Sparkles,
      tab: 'summary',
      generated: hasSummary,
      color: 'primary',
      gradient: 'from-primary/20 to-secondary/10',
      borderColor: 'border-primary/20',
      iconBg: 'bg-primary/15',
    },
    {
      title: 'Quiz',
      description: 'Test your understanding with auto-generated multiple choice questions.',
      icon: Brain,
      tab: 'quiz',
      generated: hasQuiz,
      color: 'secondary',
      gradient: 'from-secondary/20 to-purple-600/10',
      borderColor: 'border-secondary/20',
      iconBg: 'bg-secondary/15',
    },
    {
      title: 'Flashcards',
      description: 'Review key concepts with interactive flip cards for active recall.',
      icon: Layers,
      tab: 'flashcards',
      generated: hasFlashcards,
      color: 'amber-500',
      gradient: 'from-amber-500/20 to-orange-500/10',
      borderColor: 'border-amber-500/20',
      iconBg: 'bg-amber-500/15',
    },
    {
      title: 'Mind Map',
      description: 'Visualize key concepts and relationships as an interactive mind map.',
      icon: Network,
      tab: 'mindmap',
      generated: hasMindMap,
      color: 'emerald-400',
      gradient: 'from-emerald-500/20 to-teal-500/10',
      borderColor: 'border-emerald-500/20',
      iconBg: 'bg-emerald-500/15',
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Document Info Card */}
      <div className="glass p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Document Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/[0.02] rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Title</p>
            <p className="text-sm text-white font-medium line-clamp-2">{document.title}</p>
          </div>
          <div className="bg-white/[0.02] rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Uploaded</p>
            <p className="text-sm text-white font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {new Date(document.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="bg-white/[0.02] rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
            <p className="text-sm font-medium flex items-center gap-1.5">
              {document.lastGeneratedAt ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Content Generated</span>
                </>
              ) : (
                <>
                  <Circle className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-gray-400">Awaiting Generation</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* AI Features Grid */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">AI Study Tools</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((feature) => (
            <button
              key={feature.tab}
              onClick={() => onNavigateTab(feature.tab)}
              className={`text-left glass p-6 group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden`}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}`} />
                </div>
                <h4 className="text-base font-semibold text-white mb-2">{feature.title}</h4>
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">{feature.description}</p>
                
                {/* Status badge */}
                <div className="flex items-center justify-between">
                  {feature.generated ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Generated
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-white/[0.03] px-2.5 py-1 rounded-full">
                      <Circle className="w-3 h-3" />
                      Not generated
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
