import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  LayoutGrid,
  Sparkles,
  Brain,
  Layers,
  MessageSquare,
  BookOpen,
  ChevronLeft,
  Network,
  ArrowLeft,
} from 'lucide-react';
import OverviewTab from './OverviewTab';
import SummaryTab from './SummaryTab';
import QuizTab from './QuizTab';
import FlashcardsTab from './FlashcardsTab';
import ChatTab from './ChatTab';
import InsightsTab from './InsightsTab';
import MindMapTab from './MindMapTab';
import VisualLearnTab from './VisualLearnTab';
import { TrendingUp, MonitorPlay } from 'lucide-react';

interface WorkspaceMainProps {
  document: any | null;
  onDocumentUpdate: () => void;
}

type TabKey = 'overview' | 'summary' | 'quiz' | 'flashcards' | 'chat' | 'visual' | 'mindmap' | 'insights';

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'summary', label: 'Summary', icon: Sparkles },
  { key: 'quiz', label: 'Quiz', icon: Brain },
  { key: 'flashcards', label: 'Flashcards', icon: Layers },
  { key: 'chat', label: 'Chat', icon: MessageSquare },
  { key: 'visual', label: 'Visual', icon: MonitorPlay },
  { key: 'mindmap', label: 'Mind Map', icon: Network },
  { key: 'insights', label: 'Insights', icon: TrendingUp },
];

const WorkspaceMain: React.FC<WorkspaceMainProps> = ({ document, onDocumentUpdate }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const navigate = useNavigate();

  // Empty state — no document selected
  if (!document) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-fade-in h-screen">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-gray-600" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Select a space</h2>
        <p className="text-gray-500 max-w-md leading-relaxed mb-6">
          Choose a document from the sidebar or go back to home to create a new one.
        </p>
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] px-4 py-2 rounded-xl transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Home
        </button>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab document={document} onNavigateTab={(tab) => setActiveTab(tab as TabKey)} />;
      case 'summary':
        return <SummaryTab document={document} onDocumentUpdate={onDocumentUpdate} />;
      case 'quiz':
        return <QuizTab document={document} onDocumentUpdate={onDocumentUpdate} />;
      case 'flashcards':
        return <FlashcardsTab document={document} onDocumentUpdate={onDocumentUpdate} />;
      case 'chat':
        return <ChatTab document={document} onDocumentUpdate={onDocumentUpdate} />;
      case 'visual':
        return <VisualLearnTab document={document} />;
      case 'mindmap':
        return <MindMapTab document={document} onDocumentUpdate={onDocumentUpdate} />;
      case 'insights':
        return <InsightsTab documentId={document._id} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-6 pb-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center gap-3 mr-4">
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium text-sm">Back</span>
            </button>

            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-primary hover:bg-primary/10 transition-all font-medium text-sm border border-transparent hover:border-primary/20"
            >
              <span className="text-lg leading-none mb-0.5">+</span>
              New space
            </button>

            <div className="w-px h-6 bg-white/[0.1] mx-2"></div>
          </div>

          <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white line-clamp-1">{document.title?.replace('.pdf', '')}</h1>
            <p className="text-xs text-gray-500">
              Uploaded {new Date(document.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
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
                    ? 'text-white border-primary'
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
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {renderTab()}
      </div>
    </div>
  );
};

export default WorkspaceMain;
